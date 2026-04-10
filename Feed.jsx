// Mock data for admin analytics dashboard

export const analyticsStats = {
    totalUsers: 1247,
    totalTalents: 342,
    totalAgencies: 89,
    totalReferrals: 456,
    totalCollabs: 156,
    totalGroups: 67,
    totalReports: 23,
    totalPayouts: 89,
    totalPayoutAmount: 125750.00
};

export const notificationsData = [
    {
        id: 1,
        type: "new_talent",
        message: "Nova joined as a Travel creator",
        timestamp: "2026-01-11T10:30:00",
        read: false
    },
    {
        id: 2,
        type: "new_agency",
        message: "Creative Studios Agency registered",
        timestamp: "2026-01-11T08:45:00",
        read: false
    },
    {
        id: 3,
        type: "new_talent",
        message: "Kai joined as a Cooking creator",
        timestamp: "2026-01-10T16:20:00",
        read: true
    },
    {
        id: 4,
        type: "new_talent",
        message: "Mila joined as a Cats creator",
        timestamp: "2026-01-10T11:00:00",
        read: true
    },
    {
        id: 5,
        type: "new_agency",
        message: "Digital Media Corp registered",
        timestamp: "2026-01-09T15:45:00",
        read: true
    },
    {
        id: 6,
        type: "new_talent",
        message: "Jules joined as a Fitness creator",
        timestamp: "2026-01-09T10:20:00",
        read: true
    },
    {
        id: 7,
        type: "new_agency",
        message: "Global Talent Management registered",
        timestamp: "2026-01-08T14:30:00",
        read: true
    },
    {
        id: 8,
        type: "new_talent",
        message: "Rowan joined as a Music creator",
        timestamp: "2026-01-08T09:15:00",
        read: true
    }
];

export const reportsData = [
    {
        id: 1,
        reporter: "Alex Rivera",
        reported: "Sam Taylor",
        note: "Inappropriate content in video",
        date: "2026-01-14T14:00:00"
    },
    {
        id: 2,
        reporter: "Jordan Lee",
        reported: "Mila",
        note: "Spam account",
        date: "2026-01-13T10:30:00"
    },
    {
        id: 3,
        reporter: "Casey Williams",
        reported: "Kai",
        note: "Harassment in comments",
        date: "2026-01-12T18:00:00"
    },
    {
        id: 4,
        reporter: "Morgan Blake",
        reported: "Nova",
        note: "Copyright violation",
        date: "2026-01-11T09:00:00"
    },
    {
        id: 5,
        reporter: "Riley Quinn",
        reported: "Jules",
        note: "Fake profile",
        date: "2026-01-10T15:00:00"
    },
    {
        id: 6,
        reporter: "Avery Morgan",
        reported: "Rowan",
        note: "Misleading content",
        date: "2026-01-09T12:00:00"
    }
];

export const profileReportCount = 23;

// User lists data
export const usersList = [
    { id: 1, username: "alex_rivera", dateJoined: "2025-12-15T10:30:00", type: "user" },
    { id: 2, username: "jordan_lee", dateJoined: "2025-12-14T14:20:00", type: "user" },
    { id: 3, username: "casey_williams", dateJoined: "2025-12-13T09:15:00", type: "user" },
    { id: 4, username: "morgan_blake", dateJoined: "2025-12-12T16:45:00", type: "user" },
    { id: 5, username: "riley_quinn", dateJoined: "2025-12-11T11:30:00", type: "user" },
    { id: 6, username: "avery_morgan", dateJoined: "2025-12-10T13:20:00", type: "user" },
    { id: 7, username: "sam_taylor", dateJoined: "2025-12-09T08:45:00", type: "user" },
    { id: 8, username: "taylor_smith", dateJoined: "2025-12-08T15:30:00", type: "user" },
    { id: 9, username: "jordan_brown", dateJoined: "2025-12-07T10:15:00", type: "user" },
    { id: 10, username: "alex_jones", dateJoined: "2025-12-06T12:00:00", type: "user" },
];

export const talentsList = [
    { id: 1, username: "nova_travel", dateJoined: "2025-11-20T10:30:00", type: "talent" },
    { id: 2, username: "kai_cooking", dateJoined: "2025-11-18T14:20:00", type: "talent" },
    { id: 3, username: "mila_cats", dateJoined: "2025-11-15T09:15:00", type: "talent" },
    { id: 4, username: "jules_fitness", dateJoined: "2025-11-12T16:45:00", type: "talent" },
    { id: 5, username: "rowan_music", dateJoined: "2025-11-10T11:30:00", type: "talent" },
    { id: 6, username: "sage_art", dateJoined: "2025-11-08T13:20:00", type: "talent" },
    { id: 7, username: "river_photography", dateJoined: "2025-11-05T08:45:00", type: "talent" },
    { id: 8, username: "skye_fashion", dateJoined: "2025-11-03T15:30:00", type: "talent" },
    { id: 9, username: "phoenix_gaming", dateJoined: "2025-11-01T10:15:00", type: "talent" },
    { id: 10, username: "luna_wellness", dateJoined: "2025-10-28T12:00:00", type: "talent" },
];

export const agenciesList = [
    { id: 1, username: "creative_studios", dateJoined: "2025-10-15T10:30:00", type: "agency" },
    { id: 2, username: "digital_media_corp", dateJoined: "2025-10-12T14:20:00", type: "agency" },
    { id: 3, username: "global_talent_mgmt", dateJoined: "2025-10-10T09:15:00", type: "agency" },
    { id: 4, username: "elite_creators", dateJoined: "2025-10-08T16:45:00", type: "agency" },
    { id: 5, username: "star_management", dateJoined: "2025-10-05T11:30:00", type: "agency" },
    { id: 6, username: "premium_agency", dateJoined: "2025-10-03T13:20:00", type: "agency" },
    { id: 7, username: "creative_force", dateJoined: "2025-10-01T08:45:00", type: "agency" },
    { id: 8, username: "talent_network", dateJoined: "2025-09-28T15:30:00", type: "agency" },
    { id: 9, username: "influencer_group", dateJoined: "2025-09-25T10:15:00", type: "agency" },
    { id: 10, username: "brand_partners", dateJoined: "2025-09-22T12:00:00", type: "agency" },
];

// Referral stats
export const referralStats = {
    userReferrals: 234,
    talentReferrals: 156,
    agencyReferrals: 66
};
