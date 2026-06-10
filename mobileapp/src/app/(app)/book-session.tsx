import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

interface Counselor {
  id: number;
  name: string;
  email: string;
}

interface TimeSlotItem {
  timeSlot: string;
  available: boolean;
}

const getNextDays = (count = 7) => {
  const days = [];
  const start = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(start.getDate() + i);
    days.push({
      isoString: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate()
    });
  }
  return days;
};

export default function BookSessionScreen() {
  const router = useRouter();
  const { userToken, apiUrl, user } = useAuth();

  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [selectedCounselorId, setSelectedCounselorId] = useState<number | null>(null);
  
  const [days] = useState(getNextDays(7));
  const [selectedDate, setSelectedDate] = useState(days[0].isoString);

  const [slots, setSlots] = useState<TimeSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [loadingCounselors, setLoadingCounselors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Fetch counselors list
  useEffect(() => {
    const fetchCounselors = async () => {
      if (!userToken) return;
      setLoadingCounselors(true);
      setErrorMsg(null);
      try {
        const response = await fetch(`${apiUrl}/appointments/counselors`, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const resData = await response.json();
        if (response.ok && resData.success) {
          setCounselors(resData.data);
          
          // Pre-select counselor if client has an assigned counselor
          const assignedId = user?.assignedCounselorId;
          const foundAssigned = resData.data.find((c: Counselor) => c.id === assignedId);
          if (foundAssigned) {
            setSelectedCounselorId(foundAssigned.id);
          } else if (resData.data.length > 0) {
            setSelectedCounselorId(resData.data[0].id);
          }
        } else {
          setErrorMsg(resData.error || 'Failed to load counselors list.');
        }
      } catch {
        setErrorMsg('Network error. Check server status.');
      } finally {
        setLoadingCounselors(false);
      }
    };

    fetchCounselors();
  }, [userToken, apiUrl, user]);

  // 2. Fetch available slots whenever counselor or date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!userToken || !selectedCounselorId || !selectedDate) return;
      setLoadingSlots(true);
      setSelectedSlot(null);
      setErrorMsg(null);
      try {
        const response = await fetch(
          `${apiUrl}/appointments/available-slots?counselorId=${selectedCounselorId}&date=${selectedDate}`,
          { headers: { 'Authorization': `Bearer ${userToken}` } }
        );
        const resData = await response.json();
        if (response.ok && resData.success) {
          setSlots(resData.data);
        } else {
          setErrorMsg(resData.error || 'Failed to load available time slots.');
        }
      } catch {
        setErrorMsg('Network error. Could not query slots.');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [userToken, apiUrl, selectedCounselorId, selectedDate]);

  const handleBooking = async () => {
    if (!selectedCounselorId || !selectedDate || !selectedSlot) {
      setErrorMsg('Please select a counselor, date, and time slot.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          counselorId: selectedCounselorId,
          appointmentDate: selectedDate,
          timeSlot: selectedSlot,
          notes: notes.trim()
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setSuccessMsg('Session request submitted successfully!');
        setNotes('');
        setSelectedSlot(null);
      } else {
        setErrorMsg(resData.error || 'Booking failed.');
      }
    } catch {
      setErrorMsg('Network error occurred during booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center bg-white">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-skyblue font-bold text-base">Back</Text>
          </Pressable>
          <Text className="text-lg font-extrabold text-oceanblue">Book a Session</Text>
          <View className="w-10" /> {/* Spacer */}
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
          {errorMsg && (
            <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-5">
              <Text className="text-red-700 text-sm font-medium">{errorMsg}</Text>
            </View>
          )}

          {successMsg && (
            <View className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl mb-5">
              <Text className="text-emerald-700 text-base font-bold text-center mb-3">{successMsg}</Text>
              <Text className="text-emerald-700/80 text-sm text-center mb-4">
                Your counselor and the admin team will review the request shortly.
              </Text>
              <Pressable
                onPress={() => {
                  setSuccessMsg(null);
                  router.back();
                }}
                className="bg-emerald-600 rounded-xl p-3 items-center"
              >
                <Text className="text-white font-bold text-sm">View Schedule</Text>
              </Pressable>
            </View>
          )}

          {!successMsg && (
            <View className="gap-y-6">
              {/* Counselor Selector */}
              <View className="gap-y-2">
                <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Choose Counselor</Text>
                {loadingCounselors ? (
                  <ActivityIndicator size="small" color="#0ea5e9" className="self-start py-2" />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mt-1 gap-x-2">
                    {counselors.map((c) => {
                      const isSelected = selectedCounselorId === c.id;
                      const isAssigned = user?.assignedCounselorId === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedCounselorId(c.id)}
                          className={`p-4 rounded-2xl border mr-2 items-start justify-center min-w-[150px] ${
                            isSelected
                              ? 'bg-skyblue border-skyblue'
                              : 'bg-skyblue-50/20 border-skyblue-100'
                          }`}
                        >
                          <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-oceanblue-900'}`}>
                            {c.name}
                          </Text>
                          <Text className={`text-[10px] font-semibold mt-1 ${isSelected ? 'text-skyblue-100' : 'text-oceanblue-900/60'}`}>
                            {isAssigned ? ' Assigned Counselor' : 'Counselor'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Date Slider */}
              <View className="gap-y-2">
                <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Choose Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mt-1 gap-x-2">
                  {days.map((day) => {
                    const isSelected = selectedDate === day.isoString;
                    return (
                      <Pressable
                        key={day.isoString}
                        onPress={() => setSelectedDate(day.isoString)}
                        className={`p-3 rounded-2xl border items-center justify-center w-14 mr-2 ${
                          isSelected
                            ? 'bg-oceanblue border-oceanblue'
                            : 'bg-skyblue-50/20 border-skyblue-100'
                        }`}
                      >
                        <Text className={`text-xs font-bold uppercase ${isSelected ? 'text-skyblue-100' : 'text-oceanblue-900/60'}`}>
                          {day.dayName}
                        </Text>
                        <Text className={`text-lg font-extrabold mt-1 ${isSelected ? 'text-white' : 'text-oceanblue-900'}`}>
                          {day.dayNum}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Slots Selector */}
              <View className="gap-y-2">
                <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Available Times</Text>
                {loadingSlots ? (
                  <View className="flex-row items-center justify-center p-8">
                    <ActivityIndicator size="small" color="#0ea5e9" className="mr-2" />
                    <Text className="text-sm font-semibold text-oceanblue-900/60">Checking slot availability...</Text>
                  </View>
                ) : slots.length === 0 ? (
                  <Text className="text-sm text-oceanblue-900/50 mt-1 italic">No slots available for this configuration.</Text>
                ) : (
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {slots.map((s) => {
                      const isSelected = selectedSlot === s.timeSlot;
                      const isAvailable = s.available;
                      
                      return (
                        <Pressable
                          key={s.timeSlot}
                          disabled={!isAvailable}
                          onPress={() => setSelectedSlot(s.timeSlot)}
                          className={`px-3 py-3 rounded-xl border flex-grow justify-center items-center min-w-[45%] ${
                            isSelected
                              ? 'bg-skyblue border-skyblue'
                              : isAvailable
                              ? 'bg-white border-skyblue-100 active:bg-skyblue-50/30'
                              : 'bg-slate-50 border-slate-100 opacity-45'
                          }`}
                        >
                          <Text className={`font-semibold text-xs ${
                            isSelected
                              ? 'text-white'
                              : isAvailable
                              ? 'text-oceanblue-900'
                              : 'text-slate-400'
                          }`}>
                            {s.timeSlot}
                          </Text>
                          {!isAvailable && (
                            <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Booked</Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Booking Notes */}
              <View className="gap-y-2">
                <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Booking Notes (Optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Share details you'd like your counselor to review before the session..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="border border-skyblue-100 bg-skyblue-50/10 text-oceanblue-900 rounded-2xl p-4 text-base focus:border-skyblue min-h-[100px]"
                />
              </View>

              {/* Submit Action */}
              <Pressable
                onPress={handleBooking}
                disabled={submitting || !selectedSlot}
                className={`bg-skyblue active:bg-skyblue-600 rounded-xl p-4 mt-4 items-center justify-center shadow-lg shadow-skyblue-400/30 flex-row gap-x-2 ${
                  (!selectedSlot || submitting) && 'opacity-55'
                }`}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-lg">Confirm Appointment</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
