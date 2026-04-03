import { useState } from 'react';
import {
    Button, Input, Select, Textarea, Card, CardHeader, CardTitle, CardContent,
    Badge, Divider, Modal, Tabs, Toast, Skeleton, TagInput,
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui';
import { FadeInOnView, StaggerContainer, StaggerItem, HoverLift, PageTransition } from '@/components/motion';

export default function UiPreview() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tags, setTags] = useState(['React', 'Tailwind']);

    return (
        <PageTransition className="min-h-screen bg-background text-foreground p-8 md:p-16">
            <div className="max-w-5xl mx-auto space-y-16">

                <FadeInOnView>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight">Design System</h1>
                        <p className="text-muted-foreground text-lg">Muted coral accent, warm grays, soft shadows.</p>
                    </div>
                </FadeInOnView>

                <Divider />

                <StaggerContainer className="space-y-16">

                    <StaggerItem>
                        <section className="space-y-6">
                            <h2 className="text-2xl font-semibold">Buttons</h2>
                            <div className="flex flex-wrap gap-4">
                                <Button variant="primary">Primary</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="ghost">Ghost</Button>
                            </div>
                        </section>
                    </StaggerItem>

                    <StaggerItem>
                        <section className="space-y-6">
                            <h2 className="text-2xl font-semibold">Inputs & Forms</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Input placeholder="Text input..." />
                                    <Select>
                                        <option>Select Option 1</option>
                                        <option>Select Option 2</option>
                                    </Select>
                                    <TagInput tags={tags} onChange={setTags} />
                                </div>
                                <div className="space-y-4">
                                    <Textarea placeholder="Type your message..." />
                                </div>
                            </div>
                        </section>
                    </StaggerItem>

                    <StaggerItem>
                        <section className="space-y-6">
                            <h2 className="text-2xl font-semibold">Cards & Surfaces</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <HoverLift>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Soft Card</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground text-sm mb-4">Cards feature subtle borders and soft shadows.</p>
                                            <Button variant="outline" size="sm">Action</Button>
                                        </CardContent>
                                    </Card>
                                </HoverLift>
                                <Card>
                                    <CardContent className="pt-6">
                                        <Skeleton className="w-full h-8 mb-4" />
                                        <Skeleton className="w-2/3 h-4" />
                                    </CardContent>
                                </Card>
                                <Card className="flex items-center justify-center p-6 bg-secondary text-secondary-foreground border-none">
                                    Secondary Surface
                                </Card>
                            </div>
                        </section>
                    </StaggerItem>

                    <StaggerItem>
                        <section className="space-y-6">
                            <h2 className="text-2xl font-semibold">Badges</h2>
                            <div className="flex gap-4">
                                <Badge>Default</Badge>
                                <Badge variant="secondary">Secondary</Badge>
                                <Badge variant="outline">Outline</Badge>
                                <Badge variant="destructive">Destructive</Badge>
                            </div>
                        </section>
                    </StaggerItem>

                    <StaggerItem>
                        <section className="space-y-6">
                            <h2 className="text-2xl font-semibold">Data Display</h2>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Alice Doe</TableCell>
                                        <TableCell>Admin</TableCell>
                                        <TableCell className="text-right"><Badge variant="outline">Active</Badge></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Bob Smith</TableCell>
                                        <TableCell>Student</TableCell>
                                        <TableCell className="text-right"><Badge variant="secondary">Pending</Badge></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </section>
                    </StaggerItem>

                    <StaggerItem>
                        <section className="space-y-6">
                            <h2 className="text-2xl font-semibold">Interactive</h2>
                            <div className="flex flex-wrap gap-8 items-start">
                                <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>

                                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Welcome to Squrx">
                                    <p className="text-muted-foreground mb-6">This is a smooth, framer-motion powered modal component.</p>
                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                        <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
                                    </div>
                                </Modal>

                                <div className="w-full max-w-sm">
                                    <Tabs
                                        items={[
                                            { id: 'tab1', label: 'Details', content: <p className="text-sm p-4 bg-card rounded-xl border border-border mt-4">Details content goes here.</p> },
                                            { id: 'tab2', label: 'Activity', content: <p className="text-sm p-4 bg-card rounded-xl border border-border mt-4">Activity history.</p> },
                                        ]}
                                    />
                                </div>
                            </div>
                        </section>
                    </StaggerItem>

                    <StaggerItem>
                        <Toast title="Welcome back," description="Your profile has been updated successfully." variant="success" />
                    </StaggerItem>

                </StaggerContainer>
            </div>
        </PageTransition>
    );
}
