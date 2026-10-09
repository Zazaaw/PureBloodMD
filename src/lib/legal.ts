/**
 * Terms of Service and Privacy Policy content.
 * Bump TERMS_VERSION whenever the text changes in substance; the version a
 * user accepted is stored on their auth account at sign-up.
 *
 * NOTE: written as a solid starting point, not legal advice. Have an
 * Indonesian lawyer review it before a real public launch.
 */
export const TERMS_VERSION = "2026-10-09.4";
export const LEGAL_UPDATED = "8 October 2026";

export type LegalSection = { id: string; title: string; body: (string | string[])[] };

export const TERMS: LegalSection[] = [
  {
    id: "about",
    title: "1. What PureBloodMD is (and is not)",
    body: [
      "PureBloodMD is a social and dating app with a comedic theme for doctors, medical students and other healthcare people. Every profile belongs to a real member. Accounts that impersonate someone, are fake or are run by bots are removed when we find or are told about them.",
      "PureBloodMD is not a medical service. Nothing on the app, including jokes, profiles or messages, is medical advice, diagnosis or treatment. Never use the app for clinical decisions or patient care.",
      "Only members with the blue verified badge have had their identity document (KTP or passport) and medical license (STR/SIP, or a student card for medical students) reviewed by our team, at the time of review. The badge is not a guarantee of a person's character, current license status, employment, criminal history or marital status, and members without it have not been checked at all. You are responsible for deciding who to trust.",
    ],
  },
  {
    id: "eligibility",
    title: "2. Who can use it",
    body: [
      "You must be at least 21 years old and legally able to enter this agreement. One account per person. You may not use the app if we have previously removed your account.",
      "You must give accurate information about yourself and use photos of yourself only. Impersonating another person, doctor or institution is prohibited.",
    ],
  },
  {
    id: "personal-info",
    title: "3. Protect your personal information",
    body: [
      "Do not share sensitive personal information in your profile or chats, especially with someone you have not met in person:",
      [
        "Your phone or WhatsApp number, Telegram or other contact handles",
        "ID numbers (NIK/KTP, passport), STR numbers, or patient information of any kind",
        "Bank account, card, e-wallet, OTP codes, PINs or passwords",
        "Your home address, workplace schedule or real-time location",
        "Intimate photos or anything you would not want made public",
      ],
      "To protect you, phone numbers, long number sequences and chat-app links (such as wa.me) are automatically hidden in chat. This is a safety net, not a guarantee; anything you choose to share is your own responsibility.",
      "Sharing patient data violates medical confidentiality and Indonesian law. Accounts that share it will be removed.",
    ],
  },
  {
    id: "money",
    title: "4. No financial transactions",
    body: [
      "PureBloodMD does not offer, process or guarantee any payment, loan, gift, investment or sale between members. Never send or request money, bank transfers, e-wallet top-ups (OVO, GoPay, DANA, ShopeePay), phone credit, gift cards or crypto through or because of the app, whatever the story.",
      "PureBloodMD and its developers are not responsible for any transaction between members, or for any personal information a member chooses to share with another member, including any loss, fraud or misuse that results. Report anyone who asks for money or personal details.",
      "The only payments on PureBloodMD are VIP subscriptions, paid to us through the app.",
    ],
  },
  {
    id: "conduct",
    title: "5. Community rules",
    body: [
      "You agree not to:",
      [
        "Harass, threaten, stalk, bully, intimidate or blackmail anyone",
        "Send sexual content, nudity or sexual advances to anyone who has not clearly welcomed it",
        "Post hate speech or attack people for religion, ethnicity, race, gender, sexual orientation or disability",
        "Scam, spam, advertise, recruit or ask for money",
        "Post content involving minors, violence, self-harm encouragement or illegal activity",
        "Use bots, scrapers, fake accounts, or try to bypass message limits, blocks or security",
      ],
      "We may remove content, limit features, suspend or permanently delete accounts that break these rules, with or without notice, and may report illegal activity to the authorities.",
    ],
  },
  {
    id: "safety",
    title: "6. Meeting people safely",
    body: [
      "You are solely responsible for your interactions with other users, online and offline. We do not screen users and cannot guarantee anyone's behavior.",
      "If you meet someone: meet in a public place, tell a friend where you are going, arrange your own transport, and leave if you feel unsafe. In an emergency in Indonesia call 112.",
      "Use Report and Block whenever something feels wrong. Reports are confidential. You can attach up to 4 screenshots as evidence, and a copy of the conversation is kept with the report so it survives the chat ending.",
    ],
  },
  {
    id: "content",
    title: "7. Your content",
    body: [
      "You keep ownership of the photos and messages you post. You give us a limited license to store, display and process them only to run the app (for example, showing your profile and delivering your messages).",
      "Chat photos are visible only to the two people in the conversation. If nobody writes within 24 hours of a match, the match ends automatically (we call it asystole): it is deleted for both people and you may see each other in triage again. Once anyone has written, a conversation ends only after 30 days without a message. Unmatch deletes it for both people. Delete chat (swipe left in the list) only hides the messages so far for you; the match stays.",
      "EMR (Electronic Medical Record) is a feed every signed-in member can read. Threads, replies and photos you post there are visible to all members except people you blocked or who blocked you. Never post patient data, medical records or anything that could identify a patient. You can delete your own posts at any time; a post that already has replies is replaced by a removal notice so the conversation under it stays readable.",
    ],
  },
  {
    id: "vip",
    title: "8. VIP subscriptions",
    body: [
      "VIP plans renew automatically at the end of each period until you cancel. When you cancel, VIP stays active until the end of the period you already paid for and then ends. We do not give partial refunds for unused time, except where the law requires it.",
      "During the launch period PureBloodMD is free: VIP subscriptions are not offered, every member gets 20 swipes and 1 Super Like per day, and chat is unlimited. The service is available in Indonesia only for now. These limits may change, and we will tell you in the app before paid plans start.",
    ],
  },
  {
    id: "disclaimer",
    title: "9. Disclaimers",
    body: [
      "The app is provided “as is” and “as available”. We do not promise that it will be uninterrupted, error-free or secure, that you will find a match, or that any user is who they say they are.",
      "We are not responsible for the conduct of any user, on or off the app, or for any content posted by users or by third parties.",
    ],
  },
  {
    id: "liability",
    title: "10. Limitation of liability",
    body: [
      "To the maximum extent permitted by law, PureBloodMD and its developers are not liable for any indirect, incidental, special or consequential damages, or for any loss arising from: your interactions or meetings with other users; personal information you chose to share; any money, goods or services exchanged between members; reliance on any profile, badge or message; or unauthorized access to your account caused by your own actions.",
      "Where liability cannot be excluded, our total liability to you is limited to the amount you paid us in the 3 months before the claim, or Rp 500.000, whichever is lower.",
    ],
  },
  {
    id: "indemnity",
    title: "11. Your responsibility to us",
    body: [
      "You agree to compensate and defend PureBloodMD and its developers against claims, losses and costs (including reasonable legal fees) that arise from your content, your conduct, or your breach of these Terms.",
    ],
  },
  {
    id: "ending",
    title: "12. Ending your account",
    body: [
      "You can deactivate your account in Passport > Settings at any time: you are hidden from triage and consults until you reactivate. You can also delete your account there, which permanently deletes your profile, photos, matches and messages. We may suspend or end your account if you break these Terms or if needed to protect users or comply with the law.",
    ],
  },
  {
    id: "law",
    title: "13. Law and changes",
    body: [
      "These Terms are governed by the laws of the Republic of Indonesia. Disputes will first be resolved amicably; if that fails, they will be resolved in the courts of Jakarta.",
      "We may update these Terms. If a change is significant we will tell you in the app, and continuing to use the app means you accept the updated Terms.",
      "Safety concerns: use Report on the member's profile or chat. Our team reviews every report.",
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    id: "collect",
    title: "1. What we collect",
    body: [
      [
        "Account: email address, password (stored hashed by our auth provider), the country you chose at sign-up, and the date you accepted these Terms",
        "Profile: name, photo, age, gender, whether you are here for romance or to connect with colleagues, who you are looking for, specialty, hospital, country, bio and tags",
        "Credentials you enter (STR/NIM, alma mater, class year): stored privately and never shown to other users",
        "Verification documents, only if you request the badge: a photo of your ID (KTP or passport, you may cover the NIK and address) and your medical license or student card. We never ask for a selfie holding your ID. Stored in a private bucket only our reviewers can open, and deleted after the decision. Your ID is specific personal data under UU PDP and is used only to verify you",
        "Up to 4 profile photos, your Super Likes and the people who Super Liked you",
        "Approximate location: only when you tap Radar, rounded to about 1 km. Other users never see it, only a distance",
        "EMR threads, replies, photos and likes you post",
        "Messages, photos and stickers you send, swipes, matches, blocks and reports, including any screenshots you attach to a report and a copy of the reported conversation",
        "Technical data needed for security, such as sign-in records",
      ],
    ],
  },
  {
    id: "use",
    title: "2. How we use it",
    body: [
      "To run the app (show profiles, deliver messages, compute distances), keep it safe (verification, reports, blocks, automatic hiding of phone numbers in chat, abuse prevention), manage VIP, and comply with the law. We do not sell your personal data.",
    ],
  },
  {
    id: "share",
    title: "3. Who sees it",
    body: [
      "Other members see your public profile and your EMR posts (except people you blocked or who blocked you). Only the person you are chatting with sees your messages and chat photos. Our service providers (Supabase for hosting and database, Vercel for the website, Resend for email) process data on our behalf. We may disclose data when required by law or to protect someone's safety.",
    ],
  },
  {
    id: "keep",
    title: "4. How long we keep it",
    body: [
      "Matches where nobody writes within 24 hours are deleted, conversations are deleted after 30 days without a message, or immediately when you use Delete chat or Unmatch. Reports, their screenshots and the conversation copy are kept as long as needed to investigate and keep the community safe. EMR posts stay until you delete them. When you delete your account (Passport > Settings), your profile, photos, matches, messages and EMR posts are deleted right away.",
    ],
  },
  {
    id: "rights",
    title: "5. Your rights",
    body: [
      `Under Indonesia's Personal Data Protection Law (UU No. 27 Tahun 2022) you can ask to access, correct or delete your data, and withdraw consent. Edit most data in Passport, and delete your account any time in Passport > Settings.`,
    ],
  },
  {
    id: "security",
    title: "6. Security",
    body: [
      "We use access controls on every table, private storage for chat photos, coarse location and encrypted connections. No system is perfectly secure, so please follow the advice in the Terms about not sharing sensitive information.",
    ],
  },
];
