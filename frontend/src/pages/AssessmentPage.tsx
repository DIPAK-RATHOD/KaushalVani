import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useBeneficiary } from '../context/BeneficiaryContext';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { User, CheckCircle2, ArrowRight, Sparkles, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import axios from 'axios';

export const AssessmentPage: React.FC = () => {
  const { language, t, speakText } = useLanguage();
  const { beneficiary, setBeneficiary, setInterviewStep } = useBeneficiary();
  const navigate = useNavigate();

  const [currentPromptIndex, setCurrentPromptIndex] = useState<number>(0);

  const [extractedProfile, setExtractedProfile] = useState<any>({
    name: beneficiary?.name || 'User',
    age: beneficiary?.age || 24,
    location: beneficiary?.location || 'Aurangabad District',
    district: beneficiary?.district || 'Aurangabad',
    education: beneficiary?.education || '10th Class Pass',
    current_occupation: beneficiary?.current_occupation || 'Agricultural Laborer',
    desired_occupation: beneficiary?.desired_occupation || 'Solar Energy & Electrical Installation',
    existing_skills: beneficiary?.existing_skills || ['Basic Farming', 'Hand Tools Handling'],
    employment_preference: beneficiary?.employment_preference || 'wage',
    mobility_km: beneficiary?.mobility_km || 15
  });

  const promptQuestions = [
    {
      field: 'identity',
      mr: 'तुमचे नाव आणि वय सांगा.',
      hi: 'अपना नाम और उम्र बताएं।',
      en: 'What is your name and age?',
      hint: 'उदा. "माझे नाव अमोल कांबळे आहे, वय २६ वर्षे आहे"'
    },
    {
      field: 'location',
      mr: 'तुम्ही सध्या कोणत्या गावात किंवा जिल्ह्यात राहता?',
      hi: 'आप अभी किस गांव या जिले में रहते हैं?',
      en: 'Which village or district do you currently live in?',
      hint: 'उदा. "मी छत्रपती संभाजीनगर (औरंगाबाद) जिल्ह्यात राहतो"'
    },
    {
      field: 'current_occupation',
      mr: 'तुम्ही सध्या काय काम करता आणि तुमचा अनुभव काय आहे?',
      hi: 'आप अभी क्या काम करते हैं और आपका अनुभव क्या है?',
      en: 'What work do you currently do and what is your experience?',
      hint: 'उदा. "मी शेती काम करतो, ३ वर्षांचा अनुभव आहे"'
    },
    {
      field: 'desired_occupation',
      mr: 'तुम्हाला भविष्यात कोणते काम किंवा कौशल्य शिकायला आवडेल?',
      hi: 'आप भविष्य में कौन सा काम या कौशल सीखना चाहते हैं?',
      en: 'What job role or technical skill would you like to learn?',
      hint: 'उदा. "मला सोलर पॅनेल आणि विजेचे काम शिकायचे आहे"'
    },
    {
      field: 'education',
      mr: 'तुमचे उच्चतम शिक्षण किती झाले आहे? (उदा. ५ वी, ८ वी, १० वी पास)',
      hi: 'आपकी उच्चतम शिक्षा कितनी हुई है? (उदा. 5वीं, 8वीं, 10वीं पास)',
      en: 'What is your highest education level? (e.g. 8th pass, 10th pass)',
      hint: 'उदा. "मी १० वी पास आहे"'
    },
    {
      field: 'mobility',
      mr: 'प्रशिक्षणासाठी तुम्ही किती किलोमीटर जाऊ शकता आणि तुम्हाला नोकरी हवी आहे की व्यवसाय?',
      hi: 'ट्रेनिंग के लिए आप कितने किलोमीटर तक जा सकते हैं और आपको नौकरी चाहिए या बिजनेस?',
      en: 'How far can you travel for training and do you prefer a job or enterprise?',
      hint: 'उदा. "मी १५ किमी जाऊ शकतो आणि मला नोकरी हवी आहे"'
    }
  ];

  const currentQ = promptQuestions[currentPromptIndex] || promptQuestions[0];
  const questionText = currentQ[language] || currentQ['mr'];

  const parseClientEntities = (transcript: string, current: any) => {
    const lower = transcript.toLowerCase();
    let updated = { ...current };

    // Parse Name
    if (transcript.includes('नाव') || transcript.includes('नाम') || lower.includes('name') || lower.includes('i am')) {
      const parts = transcript.split(/नाव|नाम|name|is|am/i);
      if (parts.length > 1) {
        const potentialName = parts[parts.length - 1].replace(/[.,]/g, '').trim().split(' ')[0];
        if (potentialName && potentialName.length > 2) {
          updated.name = potentialName.charAt(0).toUpperCase() + potentialName.slice(1);
        }
      }
    }

    // Parse Age
    const ageMatch = transcript.match(/(\d{2})\s*(?:वर्षे|साल|years|yrs|वय|उम्र)?/);
    if (ageMatch) {
      const parsedAge = parseInt(ageMatch[1]);
      if (parsedAge >= 15 && parsedAge <= 70) {
        updated.age = parsedAge;
      }
    }

    // Parse District / Location
    const districtKeywords: Record<string, string> = {
      'संभाजीनगर': 'Aurangabad', 'औरंगाबाद': 'Aurangabad', 'aurangabad': 'Aurangabad',
      'जालना': 'Jalna', 'jalna': 'Jalna',
      'पुणे': 'Pune', 'pune': 'Pune',
      'नाशिक': 'Nashik', 'nashik': 'Nashik',
      'नांदेड': 'Nanded', 'nanded': 'Nanded',
      'लातूर': 'Latur', 'latur': 'Latur',
      'नागपूर': 'Nagpur', 'nagpur': 'Nagpur'
    };
    for (const [kw, dist] of Object.entries(districtKeywords)) {
      if (lower.includes(kw)) {
        updated.district = dist;
        updated.location = `${dist} District`;
        break;
      }
    }

    // Parse Education
    if (lower.includes('10') || lower.includes('दहावी') || lower.includes('10th') || lower.includes('दसवीं')) {
      updated.education = '10th Class Pass';
    } else if (lower.includes('12') || lower.includes('बारावी') || lower.includes('12th') || lower.includes('बारहवीं')) {
      updated.education = '12th Class Pass';
    } else if (lower.includes('8') || lower.includes('आठवी') || lower.includes('8th')) {
      updated.education = '8th Class Pass';
    } else if (lower.includes('5') || lower.includes('पांचवी') || lower.includes('5th')) {
      updated.education = '5th Class Pass';
    }

    // Parse Current Occupation
    if (lower.includes('शेती') || lower.includes('खेती') || lower.includes('farm') || lower.includes('agri')) {
      updated.current_occupation = 'Agricultural Laborer';
      updated.existing_skills = Array.from(new Set([...updated.existing_skills, 'Basic Farming', 'Hand Tools Handling']));
    } else if (lower.includes('शिवण') || lower.includes('कपडे') || lower.includes('tailor') || lower.includes('दर्जी')) {
      updated.current_occupation = 'Garment Tailor / Stitcher';
      updated.existing_skills = Array.from(new Set([...updated.existing_skills, 'Garment Stitching', 'Measurement Taking']));
    } else if (lower.includes('मॅकेनिक') || lower.includes('गॅरेज') || lower.includes('garage') || lower.includes('mechanic')) {
      updated.current_occupation = 'Workshop Helper / Mechanic';
      updated.existing_skills = Array.from(new Set([...updated.existing_skills, 'Auto Servicing', 'Mechanical Tools']));
    }

    // Parse Desired Occupation
    if (lower.includes('सोलर') || lower.includes('वीज') || lower.includes('बिजली') || lower.includes('solar') || lower.includes('electric')) {
      updated.desired_occupation = 'Solar Energy & Electrical Installation';
    } else if (lower.includes('शिवणकाम') || lower.includes('बुटीक') || lower.includes('boutique')) {
      updated.desired_occupation = 'Self-Employed Tailor & Boutique Owner';
    } else if (lower.includes('हॉस्पिटल') || lower.includes('दवाखाना') || lower.includes('health') || lower.includes('nursing')) {
      updated.desired_occupation = 'Healthcare Attendant / General Duty Assistant';
    } else if (lower.includes('कॉम्प्युटर') || lower.includes('डाटा') || lower.includes('computer') || lower.includes('data')) {
      updated.desired_occupation = 'Domestic Data Entry Operator';
    }

    // Parse Preference & Mobility
    if (lower.includes('व्यवसाय') || lower.includes('बिजनेस') || lower.includes('business') || lower.includes('enterprise')) {
      updated.employment_preference = 'self_employment';
    } else if (lower.includes('नोकरी') || lower.includes('job') || lower.includes('salary')) {
      updated.employment_preference = 'wage';
    }

    const kmMatch = lower.match(/(\d{1,2})\s*(?:km|किमी|किलोमीटर)/);
    if (kmMatch) {
      updated.mobility_km = parseInt(kmMatch[1]);
    }

    return updated;
  };

  const handleTranscriptConfirmed = async (transcript: string) => {
    let newProfile = parseClientEntities(transcript, extractedProfile);

    // Call Python AI backend for extraction refinement
    try {
      const res = await axios.post('/ai/extract-profile', {
        transcript,
        current_profile: newProfile,
        language
      });

      if (res.data) {
        newProfile = {
          ...newProfile,
          name: res.data.name || newProfile.name,
          age: res.data.age || newProfile.age,
          location: res.data.location || newProfile.location,
          district: res.data.district || newProfile.district,
          education: res.data.education || newProfile.education,
          current_occupation: res.data.current_occupation || newProfile.current_occupation,
          desired_occupation: res.data.desired_occupation || newProfile.desired_occupation,
          existing_skills: res.data.existing_skills.length ? res.data.existing_skills : newProfile.existing_skills,
          employment_preference: res.data.employment_preference || newProfile.employment_preference,
          mobility_km: res.data.mobility_km || newProfile.mobility_km
        };
      }
    } catch (err) {
      console.log('AI Extraction fallback active');
    }

    setExtractedProfile(newProfile);

    // Advance to next prompt or finish assessment
    if (currentPromptIndex < promptQuestions.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
    } else {
      // Finalize captured beneficiary and set in BeneficiaryContext
      const finalBeneficiary = {
        id: `ben-${Date.now()}`,
        name: newProfile.name || 'Beneficiary User',
        age: Number(newProfile.age) || 24,
        gender: 'Female',
        location: newProfile.location || `${newProfile.district || 'Aurangabad'} District`,
        district: newProfile.district || 'Aurangabad',
        state: 'Maharashtra',
        pincode: '431006',
        language: language === 'mr' ? 'Marathi' : (language === 'hi' ? 'Hindi' : 'English'),
        education: newProfile.education || '10th Class Pass',
        current_occupation: newProfile.current_occupation || 'Agricultural Laborer',
        existing_skills: newProfile.existing_skills.length ? newProfile.existing_skills : ['Basic Farming', 'Hand Tools Handling'],
        experience_years: 2,
        desired_occupation: newProfile.desired_occupation || 'Solar Energy & Electrical Installation',
        interests: [newProfile.desired_occupation || 'Solar Energy'],
        employment_preference: newProfile.employment_preference || 'wage',
        mobility_km: Number(newProfile.mobility_km) || 15,
        digital_literacy: 'basic' as const,
        status: 'profiled' as const,
        created_at: new Date().toISOString()
      };

      setBeneficiary(finalBeneficiary);
      setInterviewStep(3);

      // Post to backend database so Admin Dashboard immediately receives this user
      try {
        await axios.post('/api/beneficiaries', finalBeneficiary);
      } catch (e) {
        console.log('Error saving beneficiary to DB');
      }

      navigate('/profile');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
          <span className="uppercase tracking-wider text-blue-900">
            कौशलवाणी ध्वनी मूल्यमापन (Question {currentPromptIndex + 1} of {promptQuestions.length})
          </span>
          <span className="bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full">
            प्रगती: {Math.round(((currentPromptIndex + 1) / promptQuestions.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-blue-900 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentPromptIndex + 1) / promptQuestions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Voice Recorder Component */}
      <VoiceRecorder
        promptQuestion={questionText}
        onTranscriptConfirmed={handleTranscriptConfirmed}
      />

      {/* Live Extracted Beneficiary Profile Fields */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>लाइव्ह एक्सट्रॅक्ट केलेली माहिती (Live Extracted Attributes):</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Dynamic Profile Capture
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-500 block font-semibold flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-blue-900" />
              <span>नाव व वय (Name & Age):</span>
            </span>
            <span className="font-bold text-slate-900">{extractedProfile.name} ({extractedProfile.age} yrs)</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-500 block font-semibold flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-blue-900" />
              <span>जिल्हा (District/Location):</span>
            </span>
            <span className="font-bold text-slate-900">{extractedProfile.district}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-500 block font-semibold flex items-center space-x-1">
              <GraduationCap className="w-3.5 h-3.5 text-blue-900" />
              <span>शिक्षण (Education):</span>
            </span>
            <span className="font-bold text-slate-900">{extractedProfile.education}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-500 block font-semibold flex items-center space-x-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-900" />
              <span>सध्याचे काम (Current Occupation):</span>
            </span>
            <span className="font-bold text-slate-900">{extractedProfile.current_occupation}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-500 block font-semibold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-900" />
              <span>इच्छित कौशल्य (Desired Skill):</span>
            </span>
            <span className="font-bold text-blue-900">{extractedProfile.desired_occupation}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-500 block font-semibold">रोजगार प्राधान्य व प्रवास:</span>
            <span className="font-bold text-slate-900">
              {extractedProfile.employment_preference === 'wage' ? 'वेतन नोकरी' : 'स्वयंरोजगार'} ({extractedProfile.mobility_km} km)
            </span>
          </div>

        </div>
      </div>

    </div>
  );
};
