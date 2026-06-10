import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import StaffPageHeader from '@/components/staff-page-header';
import { getPostLoginRoute, isAdminRole, isStaffRole } from '@/utils/auth-routing';

type QuickAction = {
  title: string;
  subtitle: string;
  route: string;
  emoji: string;
  color: string;
  button: string;
  adminOnly?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Notifications',
    subtitle: 'Live alerts, booking updates, and safety notices',
    route: '/(staff)/notifications',
    emoji: '🔔',
    color: 'bg-violet-50 border-violet-100',
    button: 'Open alerts',
  },
  {
    title: 'Bookings',
    subtitle: 'Review and approve session requests',
    route: '/(staff)/bookings',
    emoji: '📅',
    color: 'bg-emerald-50 border-emerald-100',
    button: 'Review requests',
    adminOnly: true,
  },
  {
    title: 'Messages',
    subtitle: 'Manage direct conversations',
    route: '/(staff)/messages',
    emoji: '💬',
    color: 'bg-skyblue-50 border-skyblue-100',
    button: 'Open inbox',
  },
  {
    title: 'Calls',
    subtitle: 'Audio and video calling is coming soon',
    route: '/(staff)/calls',
    emoji: '📞',
    color: 'bg-indigo-50 border-indigo-100',
    button: 'Coming soon',
  },
  {
    title: 'Resources',
    subtitle: 'Publish and manage library items',
    route: '/(staff)/resources',
    emoji: '📚',
    color: 'bg-emerald-50 border-emerald-100',
    button: 'Manage resources',
  },
  {
    title: 'Posts',
    subtitle: 'Create community updates',
    route: '/(staff)/posts',
    emoji: '📝',
    color: 'bg-amber-50 border-amber-100',
    button: 'Post update',
  },
] as const;

export default function StaffDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const isStaff = isStaffRole(user?.role);
  const isAdmin = isAdminRole(user?.role);

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <StaffPageHeader
          title="Staff Hub"
          subtitle={isStaff ? `${user?.role} workspace` : 'Quick access to staff tools'}
        />

        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 110 }}>
          <View className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-sm">
            <Text className="text-[10px] uppercase font-black tracking-widest text-skyblue">
              Welcome
            </Text>
            <Text className="text-2xl font-extrabold text-oceanblue mt-1">
              {user?.name || 'Staff Member'}
            </Text>
            <Text className="text-sm text-oceanblue-900/60 mt-2 leading-relaxed">
              You can manage messages, bookings, notifications, resources, and community updates from here.
            </Text>
          </View>

          <View className="mt-6 gap-4">
            {QUICK_ACTIONS.filter((action) => !action.adminOnly || isAdmin).map((action) => (
              <Pressable
                key={action.route}
                onPress={() => router.push(action.route as never)}
                className={`rounded-3xl border p-5 shadow-sm active:opacity-90 ${action.color}`}
              >
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-3xl">{action.emoji}</Text>
                    <Text className="text-lg font-extrabold text-oceanblue mt-3">{action.title}</Text>
                    <Text className="text-sm text-oceanblue-900/65 mt-1.5 leading-relaxed">
                      {action.subtitle}
                    </Text>
                  </View>
                  <View className="bg-white/80 border border-white rounded-2xl px-3 py-2">
                    <Text className="text-[10px] uppercase font-black text-oceanblue">
                      {action.button}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <View className="mt-6 bg-oceanblue rounded-3xl p-5">
            <Text className="text-white font-extrabold text-base">Need to go back to the client app?</Text>
            <Text className="text-skyblue-100 text-sm mt-1.5 leading-relaxed">
              Staff users stay in this workspace by default. Clients continue into the main patient portal.
            </Text>
            <Pressable
              onPress={() => router.replace(getPostLoginRoute(user?.role))}
              className="mt-4 self-start bg-white px-4 py-2.5 rounded-xl active:opacity-85"
            >
              <Text className="text-oceanblue font-extrabold text-sm">Refresh dashboard</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
