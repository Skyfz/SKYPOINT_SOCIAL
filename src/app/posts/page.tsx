"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { Send, Plus, Trash2, ThumbsUp, MessageCircle, Share2, KeyRound, ArrowLeft, Image as ImageIcon, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- Post Interface ---
interface Post {
  _id?: string;
  post_text: string;
  scheduled_date: string; // Changed to string to match input[type=datetime-local]
  team?: string;
  platforms: string[];
  post_media?: string[];
  mediaFiles?: File[];
  post_notes?: string;
  status?: 'pending' | 'posted' | 'failed' | 'partial_success';
}

// --- FormattedPostText Helper Component ---
interface FormattedPostTextProps {
  text: string;
}

const FormattedPostText: React.FC<FormattedPostTextProps> = ({ text }) => {
  if (!text) {
    return <span className="text-gray-400 dark:text-gray-500">Your post content will appear here...</span>;
  }
  const regex = /(https?:\/\/[^\s]+|#\w+|@\w+)/g;
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
          return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>{part}</a>;
        }
        if (part.startsWith('#') || part.startsWith('@')) {
          return <span key={index} className="text-blue-500 font-semibold">{part}</span>;
        }
        return part;
      })}
    </>
  );
};

// --- Main Component for Creating Posts (New UI) ---
export default function PostManager() {
  const [post, setPost] = useState<Post>({
    post_text: '',
    scheduled_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // Default to 1 hour from now
    platforms: [],
    mediaFiles: [],
  });

  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const platformOptions = [
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    // { key: 'twitter', label: 'Twitter' },
  ];

  const handlePlatformToggle = (platformKey: string) => {
    setPost(prev => {
      const platforms = prev.platforms.includes(platformKey)
        ? prev.platforms.filter(p => p !== platformKey)
        : [...prev.platforms, platformKey];
      return { ...prev, platforms };
    });
  };
  
  const handleMediaUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newFileUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newFileUrls]);
      setPost(prev => ({ ...prev, mediaFiles: [...(prev.mediaFiles || []), ...newFiles] }));
    }
  };

  const removeMedia = (indexToRemove: number) => {
    URL.revokeObjectURL(previewUrls[indexToRemove]);
    setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    setPost(prev => ({ ...prev, mediaFiles: prev.mediaFiles?.filter((_, index) => index !== indexToRemove) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!secretKey) {
      setSubmitMessage({ type: 'error', message: 'Secret key is required.' });
      return;
    }
    if (post.platforms.length === 0) {
      setSubmitMessage({ type: 'error', message: 'Please select at least one platform.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage(null);

    const formData = new FormData();
    formData.append('secretKey', secretKey);
    formData.append('postData', JSON.stringify({
      post_text: post.post_text,
      scheduled_date: new Date(post.scheduled_date).toISOString(),
      platforms: post.platforms,
      post_notes: post.post_notes,
      team: post.team,
    }));

    if (post.mediaFiles) {
      post.mediaFiles.forEach(file => formData.append('media', file));
    }

    try {
      const response = await fetch('/api/posts', { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok) {
        setSubmitMessage({ type: 'success', message: 'Post scheduled successfully!' });
        onOpen();
        setPost({ post_text: '', scheduled_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), platforms: [], mediaFiles: [] });
        setPreviewUrls([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setSubmitMessage({ type: 'error', message: data.error || 'Failed to schedule post' });
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmitMessage({ type: 'error', message: 'A network error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Create Post</h1>
            <p className="mt-1 text-md text-gray-500 dark:text-gray-400">Compose and schedule your content across platforms.</p>
          </div>
          <button onClick={() => router.push('/')} className="flex items-center gap-2 mt-4 md:mt-0 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 space-y-6">
            <textarea
              value={post.post_text}
              onChange={(e) => setPost({ ...post, post_text: e.target.value })}
              placeholder="What's on your mind?"
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition min-h-[150px]"
              required
            />

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={url} className="relative group aspect-square">
                    <Image src={url} alt={`Preview ${index + 1}`} width={100} height={100} className="w-full h-full object-cover rounded-md" />
                    <button type="button" onClick={() => removeMedia(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-80 group-hover:opacity-100 transition-opacity z-10">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                <ImageIcon className="w-4 h-4" /> Add Image or Video
              </button>
              <input multiple type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*" className="hidden" />
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platforms</label>
                <div className="flex flex-wrap gap-3">
                    {platformOptions.map(p => (
                        <button key={p.key} type="button" onClick={() => handlePlatformToggle(p.key)} className={`px-4 py-2 text-sm font-semibold rounded-full border-2 transition-colors ${post.platforms.includes(p.key) ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduleDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule Date & Time</label>
                <input
                  id="scheduleDate"
                  type="datetime-local"
                  value={post.scheduled_date}
                  onChange={(e) => setPost({ ...post, scheduled_date: e.target.value })}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret Key</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="secretKey"
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter your secret key"
                    className="w-full pl-9 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 space-x-2 border-t border-gray-200 dark:border-gray-700">
              <button type="submit" disabled={isSubmitting || !secretKey} className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isSubmitting ? 'Posting...' : 'Post'}
                <Send className="w-4 h-4" />
              </button>
              {submitMessage && (
                  <span className={`text-sm font-semibold ${submitMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{submitMessage.message}</span>
              )}
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Preview</h3>
            <div className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center mb-4">
                <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">A</div>
                <div className="ml-3">
                  <div className="font-bold text-gray-900 dark:text-white">Alleyroads</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Just now</div>
                </div>
              </div>

              <div className="mb-3 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 text-sm">
                <FormattedPostText text={post.post_text} />
              </div>

              {previewUrls.length > 0 && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  {previewUrls.length === 1 && ( <Image src={previewUrls[0]} alt="Preview" width={500} height={300} className="w-full h-auto object-cover" /> )}
                  {previewUrls.length > 1 && (
                    <div className={`grid gap-0.5 ${previewUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                      {previewUrls.slice(0, 4).map((url, index) => (
                        <div key={index} className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                          <Image src={url} alt={`Preview ${index + 1}`} layout="fill" className="object-cover" />
                          {previewUrls.length > 4 && index === 3 && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <span className="text-white font-bold text-2xl">+{previewUrls.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-around text-gray-500 dark:text-gray-400 text-sm pt-3 mt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" className="flex items-center gap-2 hover:text-blue-500 transition-colors"><ThumbsUp className="w-5 h-5" /><span>Like</span></button>
                <button type="button" className="flex items-center gap-2 hover:text-blue-500 transition-colors"><MessageCircle className="w-5 h-5" /><span>Comment</span></button>
                <button type="button" className="flex items-center gap-2 hover:text-blue-500 transition-colors"><Share2 className="w-5 h-5" /><span>Share</span></button>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Post Scheduled</ModalHeader>
              <ModalBody><p>{submitMessage?.message}</p></ModalBody>
              <ModalFooter><Button color="primary" onPress={onClose}>Got it</Button></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
