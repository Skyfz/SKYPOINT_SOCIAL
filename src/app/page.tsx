"use client";

import { useState, useEffect } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';

// Interface for a single post
interface Post {
  _id: string;
  post_text: string;
  scheduled_date: string;
  team?: string;
  status: 'pending' | 'posted' | 'failed' | 'partial_success';
  platforms: string[];
  created_at: string;
  updated_at: string;
  post_notes?: string;
  post_media?: string;
  post_links?: Record<string, string>;
}

// Interface for the summary counts
interface Counts {
  total: number;
  pending: number;
  posted: number;
  failed: number;
  partialSuccess: number;
}

// Main Dashboard Component
export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    pending: 0,
    posted: 0,
    failed: 0,
    partialSuccess: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetches posts and counts from the API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      // In a real app, replace this with your actual API endpoint
      const response = await fetch('/api/posts'); 
      const data = await response.json();
      
      if (response.ok) {
        setPosts(data.posts);
        setCounts(data.counts);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch posts');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please check your connection.');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on initial component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Maps post status to a color for the Chip component
  const getStatusColor = (status: Post['status']): "warning" | "success" | "danger" | "primary" | "default" => {
    switch (status) {
      case 'pending': return 'warning';
      case 'posted': return 'success';
      case 'failed': return 'danger';
      case 'partial_success': return 'primary';
      default: return 'default';
    }
  };
  
  // Formats a date string to a more readable locale string
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  };

  // Calculates and formats the relative time until a post is scheduled
  const formatScheduledTime = (scheduledDate: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 0) {
      return `Overdue by ${Math.abs(Math.round(diffHours))} hours`;
    }
    if (diffHours < 1) {
      return `In ${Math.round(diffHours * 60)} minutes`;
    }
    if (diffDays < 1) {
      return `In ${Math.round(diffHours)} hours`;
    }
    return `In ${Math.round(diffDays)} days`;
  };

  // Data for the statistics cards
  const stats = [
    { label: 'Total Posts', value: counts.total, color: 'text-gray-900 dark:text-white' },
    { label: 'Pending', value: counts.pending, color: 'text-yellow-600' },
    { label: 'Posted', value: counts.posted, color: 'text-green-600' },
    { label: 'Failed', value: counts.failed, color: 'text-red-600' },
    { label: 'Partial', value: counts.partialSuccess, color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 py-8">
      <div className="max-w-4xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="justify-between md:flex mb-6">
          <header className="text-left mb-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Social Media Post Automation</h1>
            <p className="text-gray-600 dark:text-gray-300">Monitor and manage your scheduled social media posts.</p>
          </header>
          <Button
            onPress={() => router.push('/posts')}
            color="primary"
            variant="ghost"
          >
            Create Post
          </Button>
        </div>
        {/* Stats Cards using HeroUI Card component */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="dark:bg-gray-800">
              <CardBody>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
                <p className={`text-3xl font-bold ${stat.color} mt-2`}>{stat.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Recent Posts</h2>
          <div className="flex gap-2">
            
            <Button
              onPress={fetchPosts}
              isDisabled={loading}
              color="primary"
              variant="ghost"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 mb-6">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </Card>
        )}

        {/* Posts Table */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center flex justify-center items-center">
              <Spinner label="Loading posts..." color="primary" />
            </div>
          ) : posts.length === 0 && !error ? (
            <div className="text-center p-12">
               <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No posts found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new post.</p>
              <div className="mt-6">
                <Button
                  color="primary"
                  onPress={() => router.push('/posts')}
                >
                  Create Post
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Post</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Scheduled</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Platforms</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {posts.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{post.post_text}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 dark:text-gray-200">{formatDateTime(post.scheduled_date)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatScheduledTime(post.scheduled_date)}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{post.team || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {post.platforms.map((platform) => (
                            <Chip key={platform} color="default" variant="flat" size="sm">{platform}</Chip>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Chip color={getStatusColor(post.status)} variant="flat" size="md" className="capitalize">
                          {post.status.replace('_', ' ')}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Posts are automatically processed when their scheduled time arrives.</p>
        </footer>
      </div>
    </div>
  );
}
