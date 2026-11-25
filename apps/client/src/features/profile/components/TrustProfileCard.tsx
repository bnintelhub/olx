import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ProfileHeader } from './ProfileHeader';
import { ProfileSecurityCard } from './ProfileSecurityCard';
import { ProfilePublicDetails } from './ProfilePublicDetails';
import { ProfileEditForm } from './ProfileEditForm';

interface TrustProfileCardProps {
  onOpenMyAds?: () => void;
  onOpenWishlist?: () => void;
}

function getCleanErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  const data = err.response?.data;
  const raw = data?.error?.message || data?.message || err.message || fallback;
  if (typeof raw === 'string') {
    if (raw.includes('FILE_TOO_LARGE')) return 'Photo size exceeds 5MB limit.';
    if (raw.includes('INVALID_FILE_TYPE')) return 'Please upload a valid image (JPG, PNG, or WEBP).';
  }
  return raw || fallback;
}

export const TrustProfileCard: React.FC<TrustProfileCardProps> = ({
  onOpenMyAds,
  onOpenWishlist,
}) => {
  const { user, setUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [profileData, setProfileData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const fetchProfile = () => {
    apiClient
      .get('/user/profile')
      .then((res) => {
        if (res.data?.success && res.data.data) {
          const u = res.data.data;
          setProfileData(u);
          setName(u.profile?.name || '');
          setBio(u.profile?.bio || '');
          setEmail(u.email || '');
          setBusinessName(u.profile?.businessName || '');
          setAvatarUrl(u.profile?.avatarUrl || '');
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user?.id]);

  const activeUser = profileData || user;
  const profile = activeUser?.profile || {};
  const currentAvatar = avatarUrl || profile?.avatarUrl || '';
  const isPhoneVerified = Boolean(activeUser?.isPhoneVerified);
  const isEmailVerified = Boolean(activeUser?.isEmailVerified);
  const isIdentityVerified = Boolean(profile?.isIdentityVerified);
  const adsCount = activeUser?._count?.ads ?? 0;
  const favCount = activeUser?._count?.favourites ?? 0;
  const ratingAverage = Number(profile?.ratingAverage || 0);

  const criteria = [
    { label: 'Photo uploaded', met: Boolean(currentAvatar?.trim()) },
    { label: 'Phone verified', met: isPhoneVerified },
    { label: 'Full display name', met: Boolean(name?.trim()) },
    { label: 'Seller bio', met: Boolean(bio?.trim()) },
    { label: 'Email linked', met: Boolean(email?.trim()) },
  ];

  const completionPercent = Math.round(
    (criteria.filter((c) => c.met).length / criteria.length) * 100
  );

  const canUnlockVerifiedTag = criteria.every((c) => c.met);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, or WEBP)');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('images', file);

      const uploadRes = await apiClient.post('/uploads?resource=users&mediaType=avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploaded = uploadRes.data?.success && Array.isArray(uploadRes.data.data) ? uploadRes.data.data : [];
      if (uploaded && uploaded.length > 0) {
        const newUrl = uploaded[0].url || uploaded[0].displayUrl || '';
        setAvatarUrl(newUrl);

        const res = await apiClient.put('/user/profile', { avatarUrl: newUrl });
        if (res.data?.success && res.data.data) {
          setProfileData(res.data.data);
          setUser(res.data.data);
          toast.success('Profile photo updated successfully');
        }
      }
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err, 'Failed to upload photo.'));
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const res = await apiClient.put('/user/profile', { avatarUrl: null });
      if (res.data?.success && res.data.data) {
        setProfileData(res.data.data);
        setUser(res.data.data);
        setAvatarUrl('');
        toast.success('Profile photo removed');
      }
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err, 'Failed to remove photo.'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        bio: bio.trim() || undefined,
        email: email.trim() || undefined,
        businessName: businessName.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      };

      const res = await apiClient.put('/user/profile', payload);
      if (res.data?.success && res.data.data) {
        setProfileData(res.data.data);
        setUser(res.data.data);
        setIsEditing(false);
        toast.success('Profile updated successfully');
      }
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setName(profile?.name || '');
    setBio(profile?.bio || '');
    setEmail(activeUser?.email || '');
    setBusinessName(profile?.businessName || '');
    setAvatarUrl(profile?.avatarUrl || '');
    setIsEditing(false);
  };

  const handleApplyVerifiedBadge = async () => {
    if (!canUnlockVerifiedTag) {
      toast.error('Please complete all 5 profile requirements first.');
      setIsEditing(true);
      return;
    }

    setIsVerifying(true);
    try {
      const res = await apiClient.post('/user/verify-identity');
      if (res.data?.success) {
        toast.success('Verified seller badge is now active!');
        fetchProfile();
      }
    } catch (err: any) {
      toast.error(getCleanErrorMessage(err, 'Verification request failed.'));
    } finally {
      setIsVerifying(false);
    }
  };

  const memberSince = activeUser?.createdAt
    ? new Date(activeUser.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent Member';

  return (
    <div className="w-full space-y-6">
      <ProfileHeader
        name={name}
        phoneNumber={activeUser?.phoneNumber}
        businessName={businessName}
        avatarUrl={currentAvatar}
        memberSince={memberSince}
        accountType={profile?.accountType}
        isIdentityVerified={isIdentityVerified}
        adsCount={adsCount}
        favCount={favCount}
        ratingAverage={ratingAverage}
        isEditing={isEditing}
        isUploadingAvatar={isUploadingAvatar}
        onStartEdit={() => setIsEditing(true)}
        onCancelEdit={handleCancelEdit}
        onFileSelect={handleFileSelect}
        onOpenMyAds={onOpenMyAds}
        onOpenWishlist={onOpenWishlist}
      />

      <ProfileSecurityCard
        isPhoneVerified={isPhoneVerified}
        phoneNumber={activeUser?.phoneNumber}
        isEmailVerified={isEmailVerified}
        email={activeUser?.email}
        isIdentityVerified={isIdentityVerified}
        completionPercent={completionPercent}
        canUnlockVerifiedTag={canUnlockVerifiedTag}
        isVerifying={isVerifying}
        criteria={criteria}
        onApplyVerifiedBadge={handleApplyVerifiedBadge}
        onEditEmail={() => setIsEditing(true)}
      />

      {!isEditing ? (
        <ProfilePublicDetails
          name={name}
          businessName={businessName}
          email={email}
          phoneNumber={activeUser?.phoneNumber}
          bio={bio}
          onEditClick={() => setIsEditing(true)}
        />
      ) : (
        <ProfileEditForm
          name={name}
          setName={setName}
          bio={bio}
          setBio={setBio}
          email={email}
          setEmail={setEmail}
          businessName={businessName}
          setBusinessName={setBusinessName}
          avatarUrl={currentAvatar}
          isSaving={isSaving}
          isUploadingAvatar={isUploadingAvatar}
          onFileSelect={handleFileSelect}
          onRemoveAvatar={handleRemoveAvatar}
          onSubmit={handleSaveProfile}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
};
