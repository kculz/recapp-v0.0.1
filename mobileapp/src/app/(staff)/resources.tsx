import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import StaffPageHeader from '@/components/staff-page-header';

interface ResourceItem {
  id: number;
  title: string;
  description?: string;
  category: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  isPublished: boolean;
}

const CATEGORIES = ['All', 'Rehab', 'Mental Health', 'Mindfulness', 'Life Skills', 'Crisis Support'];
const TYPES = ['All', 'Article', 'Video', 'Audio', 'PDF'];

const BLANK_FORM = {
  title: '',
  description: '',
  category: 'Mental Health',
  type: 'Article',
  url: '',
  thumbnailUrl: '',
  isPublished: true,
};

const isAdminRole = (role: string) => role === 'Admin' || role === 'SuperAdmin';

export default function StaffResourcesScreen() {
  const router = useRouter();
  const { userToken, apiUrl, user } = useAuth();

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  const fetchResources = useCallback(async () => {
    if (!userToken) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (selectedType !== 'All') params.set('type', selectedType);

      const response = await fetch(`${apiUrl}/library${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setResources(Array.isArray(data.data?.resources) ? data.data.resources : []);
      } else {
        setErrorMsg(data.error || 'Failed to load resources.');
      }
    } catch {
      setErrorMsg('Network error. Could not load resources.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, selectedCategory, selectedType, userToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchResources();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchResources]);

  const canDelete = isAdminRole(user?.role || '');

  const openCreateForm = () => {
    setEditingResourceId(null);
    setForm(BLANK_FORM);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const openEditForm = (resource: ResourceItem) => {
    setEditingResourceId(resource.id);
    setForm({
      title: resource.title,
      description: resource.description || '',
      category: resource.category,
      type: resource.type,
      url: resource.url,
      thumbnailUrl: resource.thumbnailUrl || '',
      isPublished: resource.isPublished,
    });
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!userToken) return;

    if (!form.title.trim() || !form.url.trim()) {
      setErrorMsg('Title and URL are required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const url = editingResourceId ? `${apiUrl}/library/${editingResourceId}` : `${apiUrl}/library`;
      const method = editingResourceId ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMsg(editingResourceId ? 'Resource updated successfully.' : 'Resource created successfully.');
        openCreateForm();
        await fetchResources();
      } else {
        setErrorMsg(data.error || 'Failed to save resource.');
      }
    } catch {
      setErrorMsg('Network error. Could not save resource.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (resource: ResourceItem) => {
    if (!userToken) return;

    try {
      const response = await fetch(`${apiUrl}/library/${resource.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ isPublished: !resource.isPublished }),
      });

      if (response.ok) {
        setResources((previous) =>
          previous.map((item) =>
            item.id === resource.id ? { ...item, isPublished: !item.isPublished } : item
          )
        );
      }
    } catch {
      setErrorMsg('Network error. Could not update publish status.');
    }
  };

  const handleDelete = async (resource: ResourceItem) => {
    if (!userToken || !canDelete) return;

    Alert.alert('Delete resource?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${apiUrl}/library/${resource.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${userToken}` },
            });

            if (response.ok) {
              setResources((previous) => previous.filter((item) => item.id !== resource.id));
            }
          } catch {
            setErrorMsg('Network error. Could not delete resource.');
          }
        },
      },
    ]);
  };

  const handleOpenResource = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setErrorMsg('Could not open the selected resource.');
    }
  };

  const filteredCountLabel = useMemo(() => {
    return `${resources.length} resource${resources.length === 1 ? '' : 's'}`;
  }, [resources.length]);

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <StaffPageHeader
          title="Resources"
          subtitle="Publish and manage the library"
          onBack={() => router.replace('/(staff)/dashboard')}
          rightAction={
            <Pressable
              onPress={() => void fetchResources()}
              className="px-3 py-2 rounded-xl bg-white/15 active:opacity-80"
            >
              <Text className="text-white text-xs font-extrabold">Refresh</Text>
            </Pressable>
          }
        />

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          {errorMsg ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <Text className="text-sm font-semibold text-emerald-700">{successMsg}</Text>
            </View>
          ) : null}

          <View className="rounded-3xl border border-skyblue-100 bg-white p-5 shadow-sm">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-oceanblue">
                  {editingResourceId ? 'Edit resource' : 'Create resource'}
                </Text>
                <Text className="text-xs text-oceanblue-900/55 mt-1">
                  {canDelete ? 'Admins can edit, publish, and delete resources.' : 'Counselors can create and publish resources.'}
                </Text>
              </View>
              <Pressable onPress={openCreateForm} className="rounded-xl bg-skyblue-50 px-3 py-2">
                <Text className="text-xs font-extrabold text-skyblue">Clear</Text>
              </Pressable>
            </View>

            <View className="mt-4 gap-3">
              <TextInput
                value={form.title}
                onChangeText={(value) => setForm((previous) => ({ ...previous, title: value }))}
                placeholder="Resource title"
                placeholderTextColor="#94a3b8"
                className="rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
              />
              <TextInput
                value={form.url}
                onChangeText={(value) => setForm((previous) => ({ ...previous, url: value }))}
                placeholder="https://..."
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                className="rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
              />
              <TextInput
                value={form.description}
                onChangeText={(value) => setForm((previous) => ({ ...previous, description: value }))}
                placeholder="Description"
                placeholderTextColor="#94a3b8"
                multiline
                className="rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
              />

              <View className="flex-row gap-2 flex-wrap">
                {CATEGORIES.filter((category) => category !== 'All').map((category) => {
                  const isSelected = form.category === category;
                  return (
                    <Pressable
                      key={category}
                      onPress={() => setForm((previous) => ({ ...previous, category }))}
                      className={`rounded-full border px-3 py-2 ${
                        isSelected ? 'bg-skyblue border-skyblue' : 'bg-white border-skyblue-100'
                      }`}
                    >
                      <Text className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-oceanblue'}`}>
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="flex-row gap-2 flex-wrap">
                {TYPES.filter((type) => type !== 'All').map((type) => {
                  const isSelected = form.type === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setForm((previous) => ({ ...previous, type }))}
                      className={`rounded-full border px-3 py-2 ${
                        isSelected ? 'bg-oceanblue border-oceanblue' : 'bg-white border-skyblue-100'
                      }`}
                    >
                      <Text className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-oceanblue'}`}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setForm((previous) => ({ ...previous, isPublished: !previous.isPublished }))}
                className={`rounded-2xl border px-4 py-3 ${
                  form.isPublished ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                }`}
              >
                <Text
                  className={`text-xs font-extrabold uppercase tracking-wider ${
                    form.isPublished ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {form.isPublished ? 'Published' : 'Hidden'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                className={`rounded-2xl px-4 py-4 ${
                  saving ? 'bg-skyblue-200' : 'bg-skyblue'
                }`}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-center text-sm font-extrabold text-white">
                    {editingResourceId ? 'Update resource' : 'Create resource'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-oceanblue">Library items</Text>
                <Text className="text-xs text-oceanblue-900/55 mt-0.5">{filteredCountLabel}</Text>
              </View>
              <View className="flex-row gap-2">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {CATEGORIES.map((category) => {
                      const isActive = selectedCategory === category;
                      return (
                        <Pressable
                          key={category}
                          onPress={() => setSelectedCategory(category)}
                          className={`rounded-full border px-3 py-2 ${
                            isActive ? 'bg-skyblue border-skyblue' : 'bg-white border-skyblue-100'
                          }`}
                        >
                          <Text className={`text-[10px] font-black uppercase ${isActive ? 'text-white' : 'text-oceanblue'}`}>
                            {category}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              <View className="flex-row gap-2">
                {TYPES.map((type) => {
                  const isActive = selectedType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setSelectedType(type)}
                      className={`rounded-full border px-3 py-2 ${
                        isActive ? 'bg-oceanblue border-oceanblue' : 'bg-white border-skyblue-100'
                      }`}
                    >
                      <Text className={`text-[10px] font-black uppercase ${isActive ? 'text-white' : 'text-oceanblue'}`}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {loading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="small" color="#0ea5e9" />
              </View>
            ) : resources.length === 0 ? (
              <Text className="py-10 text-center text-sm font-semibold text-oceanblue-900/40">
                No resources found for the selected filters.
              </Text>
            ) : (
              <View className="mt-4 gap-3">
                {resources.map((resource) => (
                  <View key={resource.id} className="rounded-3xl border border-skyblue-100 bg-white p-4 shadow-sm">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="text-base font-extrabold text-oceanblue">{resource.title}</Text>
                          <Text className="rounded-full bg-skyblue-50 px-2 py-1 text-[10px] font-black uppercase text-skyblue">
                            {resource.type}
                          </Text>
                          <Text className="rounded-full bg-skyblue-50 px-2 py-1 text-[10px] font-black uppercase text-skyblue">
                            {resource.category}
                          </Text>
                        </View>
                        <Text className="mt-1 text-xs text-oceanblue-900/55" numberOfLines={2}>
                          {resource.description || 'No description provided.'}
                        </Text>
                        <Text className="mt-2 text-[10px] font-semibold text-oceanblue-900/40" numberOfLines={1}>
                          {resource.url}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full border px-2.5 py-1 ${
                          resource.isPublished ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            resource.isPublished ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {resource.isPublished ? 'Published' : 'Hidden'}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row flex-wrap gap-2">
                      <Pressable
                        onPress={() => void handleOpenResource(resource.url)}
                        className="rounded-2xl bg-oceanblue px-3 py-2.5"
                      >
                        <Text className="text-xs font-extrabold text-white">Open</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void handleTogglePublish(resource)}
                        className="rounded-2xl border border-skyblue-100 bg-skyblue-50 px-3 py-2.5"
                      >
                        <Text className="text-xs font-extrabold text-skyblue">
                          {resource.isPublished ? 'Hide' : 'Publish'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openEditForm(resource)}
                        className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5"
                      >
                        <Text className="text-xs font-extrabold text-amber-700">Edit</Text>
                      </Pressable>
                      {canDelete ? (
                        <Pressable
                          onPress={() => void handleDelete(resource)}
                          className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5"
                        >
                          <Text className="text-xs font-extrabold text-rose-700">Delete</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
