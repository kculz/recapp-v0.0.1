import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface StaffPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export default function StaffPageHeader({ title, subtitle, onBack, rightAction }: StaffPageHeaderProps) {
  return (
    <View className="bg-oceanblue p-5 rounded-b-3xl shadow-md">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-row items-center gap-3 flex-1">
          {onBack ? (
            <Pressable onPress={onBack} className="w-10 h-10 rounded-2xl bg-white/15 items-center justify-center active:opacity-80">
              <Text className="text-white font-black text-base">←</Text>
            </Pressable>
          ) : (
            <View className="w-10 h-10 rounded-2xl bg-white/15 items-center justify-center">
              <Text className="text-white font-black text-base">R</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-white tracking-tight">{title}</Text>
            {subtitle ? <Text className="text-xs font-semibold text-skyblue-100 mt-0.5">{subtitle}</Text> : null}
          </View>
        </View>
        {rightAction ? <View className="pt-1">{rightAction}</View> : null}
      </View>
    </View>
  );
}
