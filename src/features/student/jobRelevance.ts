import type { StudentProfile, JobVacancy } from '@/lib/mockDb/schema';

/**
 * Calculates a front-end relevance score (0-100%) between a student's profile and a job vacancy.
 * The calculation is weighted as follows:
 * - Skill match: 45%
 * - Career Goal / Domain: 25%
 * - Location preferences: 15%
 * - Job Type (Full-Time, Remote, etc.): 15%
 */
export function calculateJobRelevance(profile: StudentProfile | null, job: JobVacancy): number {
    if (!profile) {
        // Return a stable fallback score if profile isn't loaded yet
        return 70;
    }

    // 1. Skill Matching (Weight: 45)
    let skillsScore = 0;
    const studentSkills = (profile.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean);
    const jobSkills = (job.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean);

    if (jobSkills.length > 0) {
        let matchedCount = 0;
        jobSkills.forEach(js => {
            if (studentSkills.some(ss => ss.includes(js) || js.includes(ss))) {
                matchedCount++;
            }
        });
        skillsScore = (matchedCount / jobSkills.length) * 45;
    } else {
        // Fallback: search student skills within job description and title
        const jobText = `${job.title} ${job.description}`.toLowerCase();
        let matchedCount = 0;
        studentSkills.forEach(ss => {
            if (jobText.includes(ss)) {
                matchedCount++;
            }
        });
        if (studentSkills.length > 0) {
            skillsScore = Math.min(45, (matchedCount / Math.min(5, studentSkills.length)) * 45);
        } else {
            skillsScore = 20; // baseline if student has no skills entered
        }
    }

    // 2. Career Goal / Title match (Weight: 25)
    let goalScore = 0;
    if (profile.careerGoal) {
        const goal = profile.careerGoal.toLowerCase().trim();
        const title = job.title.toLowerCase();
        const desc = job.description.toLowerCase();

        if (title.includes(goal) || goal.includes(title)) {
            goalScore = 25;
        } else {
            // Overlap check for multi-word career goals
            const goalWords = goal.split(/\s+/).filter(w => w.length > 3);
            let matchedWords = 0;
            goalWords.forEach(w => {
                if (title.includes(w) || desc.includes(w)) {
                    matchedWords++;
                }
            });
            if (goalWords.length > 0) {
                goalScore = (matchedWords / goalWords.length) * 25;
            } else {
                goalScore = 12;
            }
        }
    } else {
        goalScore = 12;
    }

    // 3. Location Match (Weight: 15)
    let locationScore = 0;
    const jobLoc = job.location.toLowerCase();
    const studentLocs = (profile.locations || []).map(l => l.toLowerCase().trim()).filter(Boolean);
    if (profile.location) {
        studentLocs.push(profile.location.toLowerCase().trim());
    }

    if (jobLoc.includes('remote') || job.jobType.toLowerCase().includes('remote')) {
        locationScore = 15; // Remote matches easily
    } else if (studentLocs.length > 0) {
        const hasDirectMatch = studentLocs.some(loc => jobLoc.includes(loc) || loc.includes(jobLoc));
        locationScore = hasDirectMatch ? 15 : 5;
    } else {
        locationScore = 10; // Neutral if student has no location settings
    }

    // 4. Job Type Match (Weight: 15)
    let typeScore = 0;
    const jobType = job.jobType.toLowerCase();
    const studentTypes = (profile.jobTypes || []).map(t => t.toLowerCase().trim()).filter(Boolean);
    if (profile.jobType) {
        studentTypes.push(profile.jobType.toLowerCase().trim());
    }

    if (studentTypes.length > 0) {
        const hasTypeMatch = studentTypes.some(t => jobType.includes(t) || t.includes(jobType));
        typeScore = hasTypeMatch ? 15 : 8;
    } else {
        typeScore = 12;
    }

    // Combine and constrain score to a realistic percentage
    const rawScore = Math.round(skillsScore + goalScore + locationScore + typeScore);
    return Math.max(30, Math.min(100, rawScore));
}
