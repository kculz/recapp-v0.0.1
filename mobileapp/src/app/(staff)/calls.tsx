import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StaffPageHeader from '@/components/staff-page-header';
import ComingSoonPanel from '@/components/coming-soon-panel';
import { CALLS_COMING_SOON_MESSAGE } from '@/utils/jitsi';

export default function StaffCallsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <StaffPageHeader
          title="Calls"
          subtitle="Audio and video calls are not live yet"
          onBack={() => router.replace('/(staff)/dashboard')}
        />

        <View className="flex-1 p-5">
          <ComingSoonPanel
            icon="📞"
            title="Calling is coming soon"
            description={CALLS_COMING_SOON_MESSAGE}
            bullets={[
              'We will wire this screen to Jitsi or another conferencing provider before enabling live calls.',
              'For now, you can keep working with messages, bookings, resources, and alerts.',
              'When the call provider is ready, this hub will launch audio and video sessions directly.',
            ]}
          />

          <View className="mt-6 gap-3">
            <Pressable
              onPress={() => router.push('/(staff)/notifications' as never)}
              className="rounded-2xl bg-oceanblue px-4 py-3 active:opacity-90"
            >
              <Text className="text-center text-white font-extrabold">Open Notifications</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(staff)/dashboard')}
              className="rounded-2xl border border-skyblue-100 bg-white px-4 py-3 active:opacity-90"
            >
              <Text className="text-center text-oceanblue font-extrabold">Back to Dashboard</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
