"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Plus, RefreshCw, Twitter, Facebook, Instagram, Linkedin, Edit, Trash2 } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@heroui/react";

// --- Helper Components & Icons (Unchanged) ---
const PlatformIcon = ({ platform, className }: { platform: string; className: string }) => {
    const platformName = platform.toLowerCase();
    switch (platformName) {
        case 'twitter':
            return <Twitter className={className} />;
        case 'facebook':
            return <Facebook className={className} />;
        case 'instagram':
            return <Instagram className={className} />;
        case 'linkedin':
            return <Linkedin className={className} />;
        default:
            return <FileText className={className} />; // Default icon
    }
};


// --- Interfaces (Updated) ---
interface Post {
  _id: string;
  post_text: string;
  scheduled_date: string;
  team?: string;
  status: 'draft' | 'pending' | 'posted' | 'failed' | 'partial_success';
  platforms: string[];
  created_at: string;
  updated_at: string;
  post_notes?: string;
  post_media?: string[]; // --- CHANGE: Corrected type to match database schema (array of strings)
}

interface Counts {
  total: number;
  draft: number;
  pending: number;
  posted: number;
  failed: number;
  partialSuccess: number;
}

// --- Main Dashboard Component (New UI) ---
export default function Dashboard() {
  // --- State and Hooks (Unchanged) ---
  const [posts, setPosts] = useState<Post[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, draft: 0, pending: 0, posted: 0, failed: 0, partialSuccess: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [dataSource, setDataSource] = useState<'mock' | 'live' | null>(null);
  const [secretKey, setSecretKey] = useState('');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  // --- Data Fetching Logic (with Indicator) ---
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setDataSource(null);
      
      // MOCK DATA for demonstration.
      await new Promise(resolve => setTimeout(resolve, 1000));
       // --- CHANGE: Updated mock data to use `post_media` and longer text
      const mockPosts: Post[] = [
        { _id: '1', post_text: "Excited to announce our new product launch next week! We've been working tirelessly to bring you something truly innovative. This is going to change everything. Stay tuned for more details. #NewProduct #Innovation", scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), team: 'Marketing', status: 'pending', platforms: ['Twitter', 'Facebook'], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), post_media: ['https://placehold.co/600x400/3B82F6/FFFFFF?text=Launch+Day!'] },
        { _id: '2', post_text: "Our weekly team meeting recap is now available on the blog. Check it out to see what we've been working on, including major progress on Project Phoenix and our Q3 goals. It's a deep dive into our current roadmap.", scheduled_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), team: 'Internal Comms', status: 'posted', platforms: ['LinkedIn'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { _id: '3', post_text: "A critical API update failed to post to Instagram. The engineering team is actively investigating the issue and we hope to have a resolution shortly. We apologize for any inconvenience this may cause.", scheduled_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), team: 'DevOps', status: 'failed', platforms: ['Instagram'], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), post_media: ['https://placehold.co/600x400/EF4444/FFFFFF?text=API+Error'] },
        { _id: '4', post_text: "This post was successful on Twitter, but failed on Facebook due to an authentication error. We'll be retrying the Facebook post once the connection is re-established. Thanks for your patience.", scheduled_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), team: 'Marketing', status: 'partial_success', platforms: ['Twitter', 'Facebook'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ];
      setPosts(mockPosts);
      setCounts({ total: 4, draft: 0, pending: 1, posted: 1, failed: 1, partialSuccess: 1 });
      setError(null);
      setDataSource('mock');

      
      // Your original, working fetch logic for a real API endpoint
      const response = await fetch('/api/posts'); 
      const data = await response.json();
      
      if (response.ok) {
        setPosts(data.posts);
        setCounts(data.counts);
        setError(null);
        setDataSource('live');
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

  
    const handleEdit = (postId: string) => {
      router.push(`/posts?edit=${postId}`);
    };
  
    const handleDelete = (postId: string) => {
      if (!secretKey) {
        setError('Secret key is required to delete posts.');
        return;
      }
      
      setPostToDelete(postId);
      onOpen();
    };
    
    const confirmDelete = async () => {
      if (!postToDelete) return;
      
      try {
        const response = await fetch('/api/posts', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: postToDelete, secretKey }),
        });
  
        if (response.ok) {
          // Refresh the posts list
          fetchPosts();
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to delete post');
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        setError('Failed to delete post. Please try again.');
      } finally {
        setPostToDelete(null);
      }
    };
  
    useEffect(() => {
      fetchPosts();
    }, []);
  // --- Helper Functions (Unchanged) ---
  const getStatusInfo = (status: Post['status']): { color: string; dotColor: string; label: string } => {
    switch (status) {
      case 'draft': return { color: 'text-gray-600 dark:text-gray-400', dotColor: 'bg-gray-500', label: 'Draft' };
      case 'pending': return { color: 'text-yellow-600 dark:text-yellow-400', dotColor: 'bg-yellow-500', label: 'Pending' };
      case 'posted': return { color: 'text-green-600 dark:text-green-400', dotColor: 'bg-green-500', label: 'Posted' };
      case 'failed': return { color: 'text-red-600 dark:text-red-400', dotColor: 'bg-red-500', label: 'Failed' };
      case 'partial_success': return { color: 'text-blue-600 dark:text-blue-400', dotColor: 'bg-blue-500', label: 'Partial Success' };
      default: return { color: 'text-gray-500 dark:text-gray-400', dotColor: 'bg-gray-500', label: 'Unknown' };
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatScheduledTime = (scheduledDate: string, status:string) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diffMs = scheduled.getTime() - now.getTime();
    if (isNaN(diffMs)) return 'Invalid date';
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if ((diffMs < 0)&&(status!="posted")) return `Overdue`;
    if ((diffMs < 0)&&(status=="posted")) return `Done`;
    if (diffHours < 1) return `in ${Math.round(diffHours * 60)}m`;
    if (diffDays < 1) return `in ${Math.round(diffHours)}h`;
    return `in ${Math.round(diffDays)}d`;
  };

  // --- Data for UI Elements (Unchanged) ---
  const stats = [
    { label: 'Total Posts', value: counts.total, Icon: FileText, color: 'text-gray-900 dark:text-white' },
    { label: 'Drafts', value: counts.draft, Icon: FileText, color: 'text-gray-600 dark:text-gray-400' },
    { label: 'Pending', value: counts.pending, Icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Posted', value: counts.posted, Icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
    { label: 'Failed', value: counts.failed, Icon: XCircle, color: 'text-red-600 dark:text-red-400' },
    { label: 'Partial Success', value: counts.partialSuccess, Icon: AlertTriangle, color: 'text-blue-600 dark:text-blue-400' },
  ];
  
  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* Header with Data Source Indicator (Unchanged) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Post Dashboard</h1>
            {dataSource === 'mock' && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full dark:bg-yellow-900 dark:text-yellow-300">
                ---
              </span>
            )}
            {dataSource === 'live' && (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                Live
              </span>
            )}
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <label htmlFor="dashboardSecretKey" className="text-sm font-medium text-gray-700 dark:text-gray-300">Secret Key:</label>
              <input
                id="dashboardSecretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter secret key for deletions"
                className="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => fetchPosts()} disabled={loading} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => router.push('/posts')} className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <Plus className="h-5 w-5" />
                Create Post
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards (Updated to include Drafts) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 mb-8 md:mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between space-x-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <stat.Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{loading ? '-' : stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content: Posts List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm animate-pulse flex flex-col">
                  <div className="p-5 flex-grow flex items-start space-x-4">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
                    <div className="flex-grow space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-800 p-5 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-center">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 && !error ? (
            <div className="text-center py-16 px-6 bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No posts found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by scheduling your first post.</p>
              <div className="mt-6">
                <button onClick={() => router.push('/posts')} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  Create Post
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => {
                const statusInfo = getStatusInfo(post.status);
                const firstImage = post.post_media && post.post_media.length > 0 ? post.post_media[0] : null;

                return (
                  <div key={post._id} className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 flex flex-col">
                    
                    <div className="p-5 flex-grow flex items-start space-x-4">
                        {/* Post Image */}
                        {firstImage && (
                            <img 
                            src={firstImage} 
                            alt="Post media" 
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null; 
                                target.src = 'https://placehold.co/200x200/CCCCCC/FFFFFF?text=Error';
                            }}
                            />
                        )}
                        
                        {/* Post Content */}
                        {/* --- CHANGE: Added min-w-0 to prevent text overflow in flexbox --- */}
                        <div className="flex-grow min-w-0">
                            <p className="text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-4 break-words">{post.post_text}</p>
                        </div>
                    </div>

                    {/* Post Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-800 p-5 bg-gray-50/50 dark:bg-gray-900/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            {post.platforms.map((platform) => (
                              <PlatformIcon key={platform} platform={platform} className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            ))}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                               {formatDateTime(post.scheduled_date)} ({formatScheduledTime(post.scheduled_date,post.status)})
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={`h-2.5 w-2.5 rounded-full ${statusInfo.dotColor}`}></div>
                          <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      </div>
                      {/* Edit and Delete buttons for draft and pending posts */}
                      {(post.status === 'draft' || post.status === 'pending') && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleEdit(post._id)}
                            className="flex items-center gap-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(post._id)}
                            className="flex items-center gap-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (Unchanged) */}
        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Posts are processed automatically at their scheduled time.</p>
        </footer>
        
        {/* Delete Confirmation Modal */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Confirm Deletion</ModalHeader>
                <ModalBody>
                  <p>Are you sure you want to delete this post? This action cannot be undone.</p>
                </ModalBody>
                <ModalFooter>
                  <Button color="default" variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button color="danger" onPress={() => {
                    confirmDelete();
                    onClose();
                  }}>
                    Delete
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </main>
    </div>
  );
}
