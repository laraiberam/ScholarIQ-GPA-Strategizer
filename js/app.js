/* ==========================================================================
   ScholarIQ GPA Strategizer - Application Core
   ========================================================================== */

import { auth, db, appId } from "../firebase/firebase-config.js";
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global Application State & Selectors Cache ---
let currentUser = null;
let semestersData = [];
let trendChartInstance = null;

let currentTotalPoints = 0;
let currentTotalCredits = 0;

// Cache DOM elements
const DOM = {
    userIdDisplay: document.getElementById('user-id-display'),
    authLoading: document.getElementById('auth-loading'),
    appContainer: document.getElementById('app-container'),
    semesterForm: document.getElementById('semester-form'),
    semesterName: document.getElementById('semester-name'),
    courseList: document.getElementById('course-list'),
    courseTemplate: document.getElementById('course-template'),
    addCourseBtn: document.getElementById('add-course-btn'),
    calculateGoalBtn: document.getElementById('calculate-goal-btn'),
    targetGpa: document.getElementById('target-gpa'),
    remainingCredits: document.getElementById('remaining-credits'),
    requiredGpaDisplay: document.getElementById('required-gpa-display'),
    feasibilityBadge: document.getElementById('feasibility-badge'),
    gpaDisplay: document.getElementById('gpa-display'),
    totalCreditsDisplay: document.getElementById('total-credits-display'),
    totalCoursesDisplay: document.getElementById('total-courses-display'),
    bestSemesterDisplay: document.getElementById('best-semester-display'),
    bestSemesterGpa: document.getElementById('best-semester-gpa'),
    semestersList: document.getElementById('semesters-list'),
    trendChartCanvas: document.getElementById('trendChart')
};

// ==========================================================================
// 1. Initialization & Auth State
// ==========================================================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        DOM.userIdDisplay.textContent = `ID: ${user.uid.slice(0, 6)}`;
        DOM.authLoading.classList.add('hidden');
        DOM.appContainer.classList.remove('hidden');
        initData();
    } else {
         if (typeof __initial_auth_token !== 'undefined') {
             signInWithCustomToken(auth, __initial_auth_token);
         } else {
             signInAnonymously(auth);
         }
    }
});

// Load offline and remote data
function initData() {
    if (!currentUser) return;

    // Load from LocalStorage first for instant load or offline fallback
    try {
        const cached = localStorage.getItem(`semesters_${currentUser.uid}`);
        if (cached) {
            semestersData = JSON.parse(cached);
            updateUI();
        }
    } catch (err) {
        console.error("Failed to load from LocalStorage:", err);
    }

    // Connect to Firestore
    const q = query(collection(db, 'artifacts', appId, 'users', currentUser.uid, 'semesters'), orderBy('createdAt', 'asc'));
    onSnapshot(q, (sn) => {
        const remoteData = [];
        sn.forEach((d) => remoteData.push({ id: d.id, ...d.data() }));
        
        // Keep local offline records (id starting with "local_") that don't match any remote record by name
        const localOnly = semestersData.filter(s => 
            s.id && typeof s.id === 'string' && s.id.startsWith("local_") && !remoteData.some(r => r.name === s.name)
        );
        
        semestersData = [...remoteData, ...localOnly];
        
        // Sort chronologically by createdAt (supports both Firestore Timestamps and local ISO strings)
        const getTime = (val) => {
            if (!val) return 0;
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            if (val.seconds) return val.seconds * 1000;
            return new Date(val).getTime() || 0;
        };
        
        semestersData.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
        
        // Keep LocalStorage in sync
        try {
            localStorage.setItem(`semesters_${currentUser.uid}`, JSON.stringify(semestersData));
        } catch (err) {
            console.error("Failed to sync to LocalStorage:", err);
        }
        updateUI();
    }, (error) => {
        console.error("Firestore onSnapshot error:", error);
    });
}

// ==========================================================================
// 2. Event Listeners & Handlers
// ==========================================================================

DOM.addCourseBtn.onclick = addCourseRow;

DOM.calculateGoalBtn.addEventListener('click', () => {
    const target = parseFloat(DOM.targetGpa.value);
    const remaining = parseFloat(DOM.remainingCredits.value);

    if (isNaN(target) || isNaN(remaining) || remaining <= 0) {
        alert("Please enter valid target GPA and remaining credits.");
        return;
    }

    calculateFuturePath(target, remaining);
});

DOM.semesterForm.onsubmit = async (e) => {
    e.preventDefault();
    console.log("Save process started");
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Set loading UI state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> Saving...';
        submitBtn.classList.add('opacity-80', 'cursor-not-allowed');

        // Form fields programmatical validation
        const semesterName = DOM.semesterName.value.trim();
        if (!semesterName) {
            alert("Semester name is required.");
            throw new Error("Validation Failed: Semester name is empty");
        }

        const courseItems = [...DOM.courseList.querySelectorAll('.course-item')];
        if (courseItems.length === 0) {
            alert("Please add at least one course.");
            throw new Error("Validation Failed: No courses added");
        }

        const courses = [];
        for (let i = 0; i < courseItems.length; i++) {
            const item = courseItems[i];
            const name = item.querySelector('.course-name').value.trim();
            const creditsVal = item.querySelector('.course-credits').value;
            const gradeVal = item.querySelector('.course-grade').value;

            // Skip entirely blank rows
            if (!name && !creditsVal && !gradeVal) {
                continue;
            }

            if (!name) {
                alert(`Course name is required for course #${i + 1}.`);
                item.querySelector('.course-name').focus();
                throw new Error(`Validation Failed: Course #${i + 1} name is empty`);
            }

            const credits = parseFloat(creditsVal);
            if (isNaN(credits) || credits <= 0) {
                alert(`Credits must be a valid number greater than 0 for course "${name}".`);
                item.querySelector('.course-credits').focus();
                throw new Error(`Validation Failed: Course "${name}" has invalid credits`);
            }

            if (!gradeVal) {
                alert(`Grade is required for course "${name}".`);
                item.querySelector('.course-grade').focus();
                throw new Error(`Validation Failed: Course "${name}" has no grade selected`);
            }

            const grade = parseFloat(gradeVal);
            courses.push({ name, credits, grade });
        }

        if (courses.length === 0) {
            alert("Please complete at least one course with Name, Credits, and Grade.");
            throw new Error("Validation Failed: No complete courses");
        }

        if (!currentUser) {
            alert("Not authenticated. Please wait or refresh the page.");
            throw new Error("No Auth");
        }

        console.log("Semester data prepared");
        console.log("Saving to database");

        // Firebase write promise
        const savePromise = addDoc(collection(db, 'artifacts', appId, 'users', currentUser.uid, 'semesters'), {
            name: semesterName, 
            courses, 
            createdAt: serverTimestamp()
        });

        // 10-second timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Firebase save operation timed out after 10 seconds. Check your network or Firebase rules.")), 10000)
        );

        try {
            await Promise.race([savePromise, timeoutPromise]);
            console.log("Save successful");
        } catch (dbError) {
            console.warn("Firebase save failed or timed out. Falling back to LocalStorage:", dbError);
            
            const tempId = "local_" + Date.now();
            const newSemester = {
                id: tempId,
                name: semesterName,
                courses,
                createdAt: new Date().toISOString()
            };

            if (!semestersData.some(s => s.name === semesterName)) {
                semestersData.push(newSemester);
                try {
                    localStorage.setItem(`semesters_${currentUser.uid}`, JSON.stringify(semestersData));
                } catch (lsErr) {
                    console.error("Failed to save to LocalStorage:", lsErr);
                }
                updateUI();
            }
            console.log("Save successful");
        }
        
        // Reset form & generate standard course slots
        e.target.reset(); 
        DOM.courseList.innerHTML = ''; 
        [1,2,3].forEach(addCourseRow);

        // Success state indicator
        submitBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'opacity-80', 'cursor-not-allowed');
        submitBtn.classList.add('bg-emerald-500', 'hover:bg-emerald-600');
        submitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Saved Successfully!';
        
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
            submitBtn.classList.remove('bg-emerald-500', 'hover:bg-emerald-600');
            submitBtn.innerHTML = originalText;
        }, 2000);

    } catch (error) {
        console.error("Save failed:", error);
        if (!error.message.startsWith("Validation Failed") && error.message !== "No Auth") {
            alert("An error occurred while saving. Please try again.");
        }
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
        submitBtn.innerHTML = originalText;
    }
};

// Initialize form template slots
[1,2,3].forEach(addCourseRow);

// ==========================================================================
// 3. GPA Calculations & Business Logic
// ==========================================================================

function calculateFuturePath(target, remaining) {
    // The Core Formula: (TargetCGPA * TotalFutureCredits) - CurrentPointsEarned = PointsNeeded
    // RequiredGPA = PointsNeeded / RemainingCredits
    const totalFutureCredits = currentTotalCredits + remaining;
    const targetPointsTotal = target * totalFutureCredits;
    const pointsNeeded = targetPointsTotal - currentTotalPoints;
    const requiredGPA = pointsNeeded / remaining;

    DOM.requiredGpaDisplay.textContent = requiredGPA.toFixed(2);

    // Feasibility Engine
    DOM.feasibilityBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
    if (requiredGPA <= 0) {
         DOM.feasibilityBadge.textContent = "Already Achieved!";
         DOM.feasibilityBadge.classList.add('bg-emerald-400', 'text-emerald-950');
    } else if (requiredGPA <= 3.0) {
        DOM.feasibilityBadge.textContent = "Very Feasible";
        DOM.feasibilityBadge.classList.add('bg-emerald-400', 'text-emerald-950');
    } else if (requiredGPA <= 3.5) {
        DOM.feasibilityBadge.textContent = "Challenging but Realistic";
        DOM.feasibilityBadge.classList.add('bg-amber-400', 'text-amber-950');
    } else if (requiredGPA <= 4.0) {
        DOM.feasibilityBadge.textContent = "Difficult - Requires Excellence";
        DOM.feasibilityBadge.classList.add('bg-orange-400', 'text-orange-950');
    } else {
        DOM.feasibilityBadge.textContent = "Mathematically Impossible";
        DOM.feasibilityBadge.classList.add('bg-red-500', 'text-white');
    }
}

// ==========================================================================
// 4. UI Rendering & Dashboard Updates
// ==========================================================================

function updateUI() {
    currentTotalPoints = 0;
    currentTotalCredits = 0;
    let totalCourses = 0;
    let bestSem = { name: 'N/A', gpa: -1 };

    semestersData.forEach(sem => {
        let sPoints = 0, sCredits = 0;
        sem.courses.forEach(c => {
            sPoints += (c.credits * c.grade);
            sCredits += c.credits;
            totalCourses++;
        });
        currentTotalPoints += sPoints;
        currentTotalCredits += sCredits;
        const sGpa = sCredits ? (sPoints/sCredits) : 0;
        if (sGpa > bestSem.gpa) bestSem = { name: sem.name, gpa: sGpa };
    });

    const cgpa = currentTotalCredits ? (currentTotalPoints / currentTotalCredits).toFixed(2) : "0.00";

    // Update trend chart (optional component safety)
    try {
        renderChart();
    } catch (chartError) {
        console.error("Error updating charts:", chartError);
    }

    // Update main dashboard metrics
    try {
        DOM.gpaDisplay.textContent = cgpa;
        DOM.totalCreditsDisplay.textContent = currentTotalCredits;
        DOM.totalCoursesDisplay.textContent = totalCourses;
        DOM.bestSemesterDisplay.textContent = bestSem.name;
        DOM.bestSemesterGpa.textContent = bestSem.gpa >= 0 ? `${bestSem.gpa.toFixed(2)} GPA` : '';
    } catch (dashError) {
        console.error("Error updating dashboard statistics:", dashError);
    }

    // Update historical logs
    try {
        renderHistory();
    } catch (histError) {
        console.error("Error updating history log:", histError);
    }
}

function renderHistory() {
    const list = DOM.semestersList;
    list.innerHTML = semestersData.length ? '' : `<div class="p-12 text-center text-slate-400 italic" id="empty-state">No data yet. Add your first semester to unlock insights.</div>`;

    [...semestersData].reverse().forEach(sem => {
        let sPoints = 0, sCredits = 0;
        sem.courses.forEach(c => { sPoints += (c.credits * c.grade); sCredits += c.credits; });
        const sGpa = sCredits ? (sPoints/sCredits).toFixed(2) : "0.00";

        const el = document.createElement('div');
        el.className = "p-6 hover:bg-slate-50 transition flex justify-between items-center group";
        el.innerHTML = `
            <div>
                <div class="flex items-center gap-3">
                    <h3 class="font-bold text-slate-800">${sem.name}</h3>
                    <span class="px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600">${sGpa} SGPA</span>
                </div>
                <p class="text-sm text-slate-500 mt-1">${sem.courses.length} courses, ${sCredits} credits</p>
            </div>
            <button class="del-btn opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition p-2" data-id="${sem.id}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
            </button>
        `;
        list.appendChild(el);
    });

    // Delete handlers
    list.querySelectorAll('.del-btn').forEach(b => b.onclick = (e) => {
        if (confirm('Delete this semester record?')) {
            const idToDelete = e.currentTarget.dataset.id;
            
            // Delete locally if it is an offline-only record
            if (idToDelete.startsWith("local_")) {
                semestersData = semestersData.filter(s => s.id !== idToDelete);
                try {
                    localStorage.setItem(`semesters_${currentUser.uid}`, JSON.stringify(semestersData));
                } catch (err) {
                    console.error("Failed to update LocalStorage after deletion:", err);
                }
                updateUI();
            } else {
                // Delete from Firebase Firestore
                deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'semesters', idToDelete))
                .catch(err => {
                    console.error("Firebase delete failed, removing locally:", err);
                    semestersData = semestersData.filter(s => s.id !== idToDelete);
                    try {
                        localStorage.setItem(`semesters_${currentUser.uid}`, JSON.stringify(semestersData));
                    } catch (lsErr) {
                        console.error("Failed to update LocalStorage after deletion:", lsErr);
                    }
                    updateUI();
                });
            }
        }
    });
}

// ==========================================================================
// 5. Chart Functions
// ==========================================================================

function renderChart() {
    const ctx = DOM.trendChartCanvas.getContext('2d');
    const labels = semestersData.map(s => s.name);
    const data = semestersData.map(s => {
        let p = 0, c = 0; 
        s.courses.forEach(cr => { p += cr.credits * cr.grade; c += cr.credits; });
        return c ? (p / c).toFixed(2) : 0;
    });

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: { 
            labels, 
            datasets: [{ 
                data, 
                borderColor: '#6366f1', 
                backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                tension: 0.3, 
                fill: true, 
                pointRadius: 6, 
                pointHoverRadius: 8, 
                pointBackgroundColor: '#6366f1', 
                borderWidth: 3 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                y: { min: 0, max: 4.0, grid: { display: true, color: '#f1f5f9' } }, 
                x: { grid: { display: false } } 
            }, 
            plugins: { legend: { display: false } } 
        }
    });
}

// ==========================================================================
// 6. Utility Functions
// ==========================================================================

function addCourseRow() {
    DOM.courseList.appendChild(DOM.courseTemplate.content.cloneNode(true));
    attachRemovalListeners();
}

function attachRemovalListeners() {
    DOM.courseList.querySelectorAll('.remove-course').forEach(b => {
        b.onclick = (e) => e.target.closest('.course-item').remove();
    });
}
