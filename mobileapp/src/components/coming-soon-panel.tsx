import { Text, View } from 'react-native';

interface ComingSoonPanelProps {
  icon: string;
  title: string;
  description: string;
  bullets: string[];
}

export default function ComingSoonPanel({ icon, title, description, bullets }: ComingSoonPanelProps) {
  return (
    <View className="rounded-3xl border border-skyblue-100 bg-white p-6 shadow-sm">
      <View className="w-14 h-14 rounded-2xl bg-skyblue-50 items-center justify-center">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <Text className="mt-4 text-2xl font-extrabold text-oceanblue">{title}</Text>
      <Text className="mt-2 text-sm leading-relaxed text-oceanblue-900/65">{description}</Text>

      <View className="mt-5 gap-3">
        {bullets.map((bullet) => (
          <View key={bullet} className="flex-row items-start gap-2">
            <Text className="text-skyblue font-black text-base">•</Text>
            <Text className="flex-1 text-sm text-oceanblue-900/70 leading-relaxed">{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
