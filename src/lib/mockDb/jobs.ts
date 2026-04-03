export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  postedAt: string;
  applyUrl: string;
}

export const initialJobs: JobListing[] = [
  { id: 'job-1', title: 'Senior Software Engineer', company: 'TechCorp Global', location: 'New York, NY', type: 'Full-Time', salary: '$140k - $160k', description: 'Looking for a seasoned engineer with 5+ years of React/Node experience. Great benefits package.', postedAt: '2 days ago', applyUrl: 'https://example.com/apply/1' },
  { id: 'job-2', title: 'Product Marketing Manager', company: 'Innovate AI', location: 'London, UK (Hybrid)', type: 'Hybrid', salary: '£65k - £80k', description: 'Lead the global marketing strategy for our flagship AI platform.', postedAt: '5 hours ago', applyUrl: 'https://example.com/apply/2' },
  { id: 'job-3', title: 'Data Scientist', company: 'Quant Finance', location: 'Singapore', type: 'Full-Time', salary: 'SGD 120k', description: 'Build predictive models for high-frequency trading applications.', postedAt: 'Yesterday', applyUrl: 'https://example.com/apply/3' },
  { id: 'job-4', title: 'UX/UI Designer', company: 'Creative Studio', location: 'Berlin, Germany', type: 'Remote', salary: '€50k - €65k', description: 'Design delightful enterprise software interfaces. strong portfolio required.', postedAt: '3 days ago', applyUrl: 'https://example.com/apply/4' },
  ...Array.from({ length: 21 }).map((_, i) => ({
    id: `job-${i + 5}`,
    title: ['Frontend Developer', 'Backend Engineer', 'Product Manager', 'DevOps Specialist', 'Data Analyst'][i % 5],
    company: ['Acme Corp', 'Globex', 'Soylent', 'Initech', 'Umbrella Corp'][i % 5] + ` ${i}`,
    location: ['San Francisco, CA', 'Austin, TX', 'Remote', 'Toronto, ON', 'Sydney, AUS'][i % 5],
    type: ['Full-Time', 'Contract', 'Hybrid', 'Remote', 'Internship'][i % 5],
    salary: `$${80 + (i % 5) * 10}k - $${100 + (i % 5) * 10}k`,
    description: `This is a great opportunity to join a fast-growing team. We are looking for individuals passionate about building scalable solutions and delivering high-quality products. Role number ${i + 5}.`,
    postedAt: `${(i % 5) + 1} days ago`,
    applyUrl: `https://example.com/apply/${i + 5}`
  }))
];

export function getMockJobs(): JobListing[] {
  const stored = localStorage.getItem('squrx_mock_jobs');
  if (stored) return JSON.parse(stored);
  localStorage.setItem('squrx_mock_jobs', JSON.stringify(initialJobs));
  return initialJobs;
}
