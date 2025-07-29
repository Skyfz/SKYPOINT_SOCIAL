"use client";

import { useState, useEffect } from 'react';

interface Post {
  _id: string;
  notion_page_id: string;
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

interface Counts {
  total: number;
  pending: number;
  posted: number;
  failed: number;
  partialSuccess: number;
}

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

  const fetchPosts = async () => {
    try {
      setLoading(true);
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
      setError('Failed to connect to the server');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'posted': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'partial_success': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatScheduledTime = (scheduledDate: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 0) {
      return `Overdue by ${Math.abs(Math.round(diffHours))} hours`;
    } else if (diffHours < 1) {
      return `In ${Math.round(diffHours * 60)} minutes`;
    } else if (diffDays < 1) {
      return `In ${Math.round(diffHours)} hours`;
    } else {
      return `In ${Math.round(diffDays)} days`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Social Media Post Automation</h1>
          <p className="text-gray-600">Monitor your Notion-driven social media posts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-gray-900">{counts.total}</div>
              <div className="ml-4 text-sm font-medium text-gray-500">Total Posts</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-yellow-600">{counts.pending}</div>
              <div className="ml-4 text-sm font-medium text-gray-500">Pending</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-green-600">{counts.posted}</div>
              <div className="ml-4 text-sm font-medium text-gray-500">Posted</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-red-600">{counts.failed}</div>
              <div className="ml-4 text-sm font-medium text-gray-500">Failed</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl font-bold text-orange-600">{counts.partialSuccess}</div>
              <div className="ml-4 text-sm font-medium text-gray-500">Partial</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Posts</h2>
          <button
            onClick={fetchPosts}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Posts Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading posts...</div>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">No posts found. Create a post in Notion to get started.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Post
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platforms
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 line-clamp-2 max-w-xs">
                          {post.post_text}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Notion ID: {post.notion_page_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(post.scheduled_date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatScheduledTime(post.scheduled_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {post.team || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {post.platforms.map((platform) => (
                            <span 
                              key={platform} 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(post.status)}`}>
                          {post.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Posts are automatically processed when their scheduled time arrives.</p>
          {/* <LastUpdatedTimestamp /> */}
        </div>
      </div>
    </div>
  );
}
