import { useState, useMemo, useEffect } from 'react';
import { useRecruiterStore } from './store';
import { Card, CardContent, Button, Select, Badge, Drawer, Textarea, Toast } from '@/components/ui';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Briefcase, MapPin, Search, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { StudentProfile, User as DbUser, JobApplication } from '@/lib/mockDb/schema';

type CandidateData = { profile: StudentProfile, applications: JobApplication[], user: DbUser };

export function RecruiterCandidates() {
    const { vacancies, candidates, loadCandidates, makeDecision } = useRecruiterStore();
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('');
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateData | null>(null);
    const [notes, setNotes] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        loadCandidates();
    }, [loadCandidates]);

    const activeVacancies = vacancies.filter(v => v.status === 'Active');
    const selectedVacancy = vacancies.find(v => v.id === selectedVacancyId);

    // Calculate Matches
    const matchedCandidates = useMemo(() => {
        if (!selectedVacancy) return [];

        return candidates.map(student => {
            let score = 0;

            // Location match (20%)
            if (student.profile.location.toLowerCase().includes(selectedVacancy.location.toLowerCase()) ||
                selectedVacancy.location.toLowerCase().includes('remote')) {
                score += 20;
            }

            // Job Type match (20%)
            if (student.profile.jobType === selectedVacancy.jobType) {
                score += 20;
            }

            // Skills match (60%)
            if (selectedVacancy.skills.length > 0) {
                const matchedSkills = student.profile.skills.filter((s: string) =>
                    selectedVacancy.skills.some((vs: string) => vs.toLowerCase() === s.toLowerCase())
                );
                const skillScore = (matchedSkills.length / selectedVacancy.skills.length) * 60;
                score += Math.min(skillScore, 60);
            } else {
                score += 60; // if no skills required
            }

            return { student, score: Math.round(score) };
        }).sort((a, b) => b.score - a.score); // highest score first
    }, [selectedVacancy, candidates]);

    const handleDecision = (status: 'SHORTLIST' | 'REJECT' | 'HOLD') => {
        if (!selectedVacancy || !selectedCandidate) return;
        const app = selectedCandidate.applications.find(a => a.vacancyId === selectedVacancy.id);
        if (app) {
            makeDecision(app.id, status, notes);
            setToastMessage(`Candidate marked as ${status}`);
        } else {
            setToastMessage(`Cannot decide; candidate hasn't applied yet.`);
        }
        setSelectedCandidate(null);
    };

    const openCandidate = (student: CandidateData) => {
        setSelectedCandidate(student);
        const app = student.applications.find(a => a.vacancyId === selectedVacancyId);
        setNotes(app?.decision?.notes || '');
    };

    return (
        <PageTransition className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Candidate Sourcing</h1>
                    <p className="text-muted-foreground mt-1">Filter the network and match candidates to your active roles.</p>
                </div>
            </div>

            <Card className="border-border/60 shadow-sm bg-card mb-6">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-1.5">
                        <label className="text-sm font-semibold">Target Vacancy</label>
                        <Select
                            value={selectedVacancyId}
                            onChange={(e) => setSelectedVacancyId(e.target.value)}
                            className="w-full h-11"
                        >
                            <option value="" disabled>Select an active vacancy to match...</option>
                            {activeVacancies.map(v => (
                                <option key={v.id} value={v.id}>{v.title} ({v.location})</option>
                            ))}
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {!selectedVacancyId ? (
                <Card className="border-dashed border-2 border-border/60 bg-muted/10 h-64 flex flex-col items-center justify-center text-center">
                    <Search className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">Awaiting Selection</h3>
                    <p className="text-muted-foreground">Please select a vacancy above to run the matching algorithm.</p>
                </Card>
            ) : (
                <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchedCandidates.map(({ student, score }) => {
                        const app = student.applications.find(a => a.vacancyId === selectedVacancyId);
                        const decision = app?.decision;

                        return (
                            <StaggerItem key={student.user.id}>
                                <HoverLift>
                                    <Card
                                        className={`h-full border-border/60 cursor-pointer transition-colors relative ${decision?.status === 'REJECT' ? 'opacity-60 grayscale-[50%]' : 'hover:border-primary/40'}`}
                                        onClick={() => openCandidate(student)}
                                    >
                                        <div className="absolute top-4 right-4 z-10">
                                            <Badge variant={score >= 70 ? 'default' : score >= 40 ? 'secondary' : 'outline'} className={score >= 70 ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm' : ''}>
                                                {score}% Match
                                            </Badge>
                                        </div>

                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                                                    {student.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold leading-tight line-clamp-1">{student.user.name}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{student.profile.careerGoal.slice(0, 30)}...</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm text-foreground/80 mb-4">
                                                <div className="flex items-center gap-2"><Briefcase size={14} className="opacity-70" /> {student.profile.jobType}</div>
                                                <div className="flex items-center gap-2"><MapPin size={14} className="opacity-70" /> {student.profile.location}</div>
                                                <div className="flex items-center gap-2">
                                                    {app ? <span className="text-emerald-500 text-xs font-bold">Applied</span> : <span className="text-muted-foreground text-xs">Not Applied</span>}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-1 mt-4">
                                                {student.profile.skills.slice(0, 3).map((skill: string) => (
                                                    <span key={skill} className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {student.profile.skills.length > 3 && (
                                                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium">+{student.profile.skills.length - 3} more</span>
                                                )}
                                            </div>

                                            {decision?.status && (
                                                <div className={`mt-4 pt-4 border-t border-border flex items-center justify-center gap-2 text-sm font-bold ${decision.status === 'SHORTLIST' ? 'text-emerald-500' :
                                                    decision.status === 'REJECT' ? 'text-destructive' : 'text-amber-500'
                                                    }`}>
                                                    {decision.status === 'SHORTLIST' && <CheckCircle size={16} />}
                                                    {decision.status === 'REJECT' && <XCircle size={16} />}
                                                    {decision.status === 'HOLD' && <Clock size={16} />}
                                                    {decision.status}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </HoverLift>
                            </StaggerItem>
                        );
                    })}
                </StaggerContainer>
            )}

            {/* Candidate Profile Drawer */}
            <Drawer
                isOpen={!!selectedCandidate}
                onClose={() => setSelectedCandidate(null)}
                title="Candidate Profile"
            >
                {selectedCandidate && selectedVacancy && (
                    <div className="space-y-6 pb-24">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
                                    {selectedCandidate.user.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedCandidate.user.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedCandidate.user.email}</p>
                                </div>
                            </div>
                            {selectedCandidate.profile.cvUrl && (
                                <a href={selectedCandidate.profile.cvUrl} className="flex items-center text-sm font-medium text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
                                    <Download size={16} className="mr-2" /> Resume
                                </a>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Location</p>
                                <p className="text-sm font-medium">{selectedCandidate.profile.location}</p>
                            </div>
                            <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Job Type</p>
                                <p className="text-sm font-medium">{selectedCandidate.profile.jobType}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold border-b border-border/50 pb-2">Career Goal</h4>
                            <p className="text-sm text-foreground/80 italic">"{selectedCandidate.profile.careerGoal}"</p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold border-b border-border/50 pb-2">Technical Skills</h4>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {selectedCandidate.profile.skills.map((skill: string) => (
                                    <Badge key={skill} variant="secondary">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold">Your Review Notes</h4>
                            <Textarea
                                placeholder="Internal notes for your team (not visible to candidate)..."
                                className="resize-none h-24"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="fixed bottom-0 right-0 w-full max-w-md p-4 bg-card/95 backdrop-blur border-t border-border z-10 flex gap-2 drawer-footer">
                            <Button
                                variant="outline"
                                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                                onClick={() => handleDecision('REJECT')}
                            >
                                Reject
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-500/10"
                                onClick={() => handleDecision('HOLD')}
                            >
                                Hold
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
                                onClick={() => handleDecision('SHORTLIST')}
                            >
                                Shortlist
                            </Button>
                        </div>
                    </div>
                )}
            </Drawer>

            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[100]">
                    <Toast variant="success" title="Success" onClose={() => setToastMessage(null)}>
                        {toastMessage}
                    </Toast>
                </div>
            )}
        </PageTransition>
    );
}
