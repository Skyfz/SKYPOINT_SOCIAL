"use client";

import { useState, useRef, useEffect } from 'react';
import { Button, Textarea, Select, SelectItem, DatePicker, Card, CardBody, CardHeader, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Input, type Selection } from '@heroui/react';
import { Send, Plus, Trash2 } from 'lucide-react';
import { parseAbsoluteToLocal, ZonedDateTime } from '@internationalized/date';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import Next.js Image component

// --- UPDATE THE INTERFACE ---
// We add `mediaFiles` to hold the actual file objects for uploading.
interface Post {
  _id?: string;
  post_text: string;
  scheduled_date: Date | null;
  team?: string;
  platforms: string[];
  post_media?: string[]; // This will now be populated by the server response
  mediaFiles?: File[];   // This holds the files selected by the user
  post_notes?: string;
  status?: 'pending' | 'posted' | 'failed' | 'partial_success';
}

// Main Component for Creating and Managing Posts
export default function PostManager() {
  // --- UPDATE THE INITIAL STATE ---
  const [post, setPost] = useState<Post>({
    post_text: '',
    scheduled_date: null,
    platforms: [],
    mediaFiles: [], // Initialize as an empty array
  });

  // --- Other state remains the same ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Set initial date on client-side to prevent hydration mismatch
  useEffect(() => {
    setPost(p => ({ ...p, scheduled_date: new Date() }));
    setIsMounted(true);
  }, []);

  const platformOptions = [
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' }
  ];

  // --- Event Handlers ---

  const handleUploadButtonClick = () => fileInputRef.current?.click();

  // This function is now correctly typed
  const handlePlatformChange = (keys: Selection) => {
    setPost({ ...post, platforms: Array.from(keys) as string[] });
  };

  const handleDateTimeChange = (dateTime: ZonedDateTime | null) => {
    if (dateTime) {
      setPost({ ...post, scheduled_date: dateTime.toDate() });
    }
  };

  // --- UPDATED: handleMediaUpload ---
  // This now stores the actual File objects in state, not just placeholder paths.
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      // Create temporary URLs for previewing the images
      const newFileUrls = newFiles.map(file => URL.createObjectURL(file));

      setPreviewUrls(prev => [...prev, ...newFileUrls]);
      setPost(prev => ({
        ...prev,
        mediaFiles: [...(prev.mediaFiles || []), ...newFiles]
      }));
    }
  };

  // --- UPDATED: removeMedia ---
  // This now removes the file from both the preview URLs and the File object array.
  const removeMedia = (indexToRemove: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[indexToRemove]);

    setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    setPost(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles?.filter((_, index) => index !== indexToRemove)
    }));
  };

  // --- UPDATED: handleSubmit ---
  // This is the biggest change. It now uses FormData to send files and data.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post.scheduled_date || post.platforms.length === 0) {
      setSubmitMessage({ type: 'error', message: 'Please select a date and at least one platform.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage(null);

    // 1. Create a FormData object
    const formData = new FormData();

    // 2. Append the text data as a single JSON string
    formData.append('postData', JSON.stringify({
      post_text: post.post_text,
      scheduled_date: post.scheduled_date.toISOString(),
      platforms: post.platforms,
      post_notes: post.post_notes,
      team: post.team,
    }));

    // 3. Append each media file to the FormData object
    if (post.mediaFiles) {
      post.mediaFiles.forEach(file => {
        formData.append('media', file);
      });
    }

    try {
      // 4. Send the FormData to the server.
      // The browser will automatically set the correct 'Content-Type' for multipart/form-data.
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage({ type: 'success', message: 'Post scheduled successfully!' });
        onOpen();
        // Reset form completely
        setPost({ post_text: '', scheduled_date: new Date(), platforms: [], mediaFiles: [] });
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

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex mx-auto justify-between mb-2">
          <header className="text-left mb-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Create Social Media Post</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Schedule your social media content with ease.</p>
          </header>
          <Button
            onPress={() => router.push('/')}
            color="primary"
            variant="ghost"
          >
            Home
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Post Creation Form */}
          <div className="md:col-span-1">
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Post Details</h2>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Post Content */}
                  <Textarea
                    label="Post Content"
                    placeholder="What would you like to share?"
                    value={post.post_text}
                    onChange={(e) => setPost({ ...post, post_text: e.target.value })}
                    required
                    minRows={5}
                  />

                  {/* Media Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Media (Optional)</label>
                    {previewUrls.length > 0 && (
                      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {previewUrls.map((url, index) => {
                          const isVideo = post.mediaFiles?.[index]?.type.startsWith('video/');
                          return (
                            <div key={url} className="relative group aspect-square">
                              {isVideo ? (
                                <video src={url} controls className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                // Using next/image for optimized images
                                <Image src={url} alt={`Preview ${index + 1}`} width={200} height={200} className="w-full h-full object-cover rounded-lg" />
                              )}
                              <Button isIconOnly color="danger" size="sm" variant="solid" className="absolute top-1 right-1 opacity-50 group-hover:opacity-100 transition-opacity z-10" onClick={() => removeMedia(index)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Button variant="ghost" onClick={handleUploadButtonClick} startContent={<Plus className="w-4 h-4" />}>
                      Add Media
                    </Button>
                    <input multiple type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*" className="hidden" />
                  </div>

                  {/* Platforms */}
                  <Select label="Platforms" placeholder="Select platforms" selectionMode="multiple" selectedKeys={post.platforms} onSelectionChange={handlePlatformChange} required>
                    {platformOptions.map((p) => <SelectItem key={p.key}>{p.label}</SelectItem>)}
                  </Select>
                  
                  {/* Schedule Date & Time */}
                  <div>
                    {isMounted && post.scheduled_date ? (
                      <DatePicker
                        label="Schedule Date and Time"
                        value={parseAbsoluteToLocal(post.scheduled_date.toISOString())}
                        onChange={handleDateTimeChange}
                        granularity="minute"
                      />
                    ) : (
                      <Input isDisabled label="Schedule Date and Time" className="w-full" />
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-between">
                    <Button color="primary" type="submit" isLoading={isSubmitting} startContent={<Send className="w-4 h-4" />} className="px-6">
                      Schedule Post
                    </Button>
                    {submitMessage && submitMessage.type === 'error' && (
                      <Chip color="danger" variant="flat">{submitMessage.message}</Chip>
                    )}
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Preview Column */}
          <div className="space-y-8">
            <Card className="dark:bg-gray-800">
              <CardHeader><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Post Preview</h3></CardHeader>
              <CardBody>
                <div className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">AR</div>
                    <div className="ml-3">
                      <div className="font-semibold text-gray-900 dark:text-white">Alleyroads</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Just now</div>
                    </div>
                  </div>
                  <div className="mb-3 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                    {post.post_text || <span className="text-gray-400 dark:text-gray-500">Your post content will appear here...</span>}
                  </div>
                  
                  {/* Enhanced Media Preview Section */}
                  {previewUrls.length > 0 && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      {/* Single Image */}
                      {previewUrls.length === 1 && (
                        <Image src={previewUrls[0]} alt="Preview" width={500} height={500} className="w-full h-auto object-cover" />
                      )}
                      {/* Multiple Images */}
                      {previewUrls.length > 1 && (
                        <div className={`grid gap-px ${
                          previewUrls.length === 2 ? 'grid-cols-2' :
                          previewUrls.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2' // for 4 or more
                        }`}>
                          {previewUrls.slice(0, 4).map((url, index) => (
                            <div key={index} className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                              <Image src={url} alt={`Preview ${index + 1}`} width={250} height={250} className="w-full h-full object-cover" />
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

                  <div className="flex space-x-4 text-gray-500 dark:text-gray-400 text-sm pt-4">
                    <span>Like</span><span>Comment</span><span>Share</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Success Modal */}
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
