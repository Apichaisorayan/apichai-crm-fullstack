export const PLATFORM_ORDER_MAPPING = [
    { order: 1, platform: 'WP Form', sources: ['SEO_Web', 'SEM_Web', 'SEM_byrtn', 'SEM_sp.rtn'] },
    { order: 2, platform: 'Email', sources: ['Direct', 'Email Campaign', 'Unknown'] },
    { order: 3, platform: 'WhatsApp', sources: ['SEO_Web', 'SEM_Web', 'fb_rtn_ad', 'ig_rtn_ad'] },
    { order: 4, platform: 'Facebook', sources: ['fb_rtn_inter', 'fb_rtn_main', 'fb_rtn_for_men', 'fb_rtn_for_ladies', 'fb_rtn_bariatric', 'fb_rtn_aesthetic', 'fb_rtn_ad'] },
    { order: 5, platform: 'IG', sources: ['ig_rtn_inter', 'ig_rtn_main', 'ig_rtn_aesthetic', 'ig_rtn_bariatric', 'ig_rtn_ad', 'ig_rtn_indo'] },
    { order: 6, platform: 'Tiktok', sources: ['tt_sur', 'tt_ns', 'tt_main', 'tt_inter'] },
    { order: 7, platform: 'Line', sources: ['SEO_Web', 'SEM_Web', 'Line_welcome', 'Fb_organic', 'miraDryTh', 'Multisource', 'Unknown'] },
    { order: 8, platform: 'Walk In', sources: ['Direct', 'Unknown'] },
    { order: 9, platform: 'Referral', sources: ['Referral'] },
    { order: 10, platform: 'Call', sources: ['Direct', 'Call_TH', 'Unknown'] },
    { order: 11, platform: 'Agency', sources: ['MEDICAL DEPARTURE', 'WHATCLINIC', 'URBAN BEAUTY', 'ZENIFY AGENT', 'REALSELF', 'BOOKIMED', 'GOWABI', 'JOSHUA AGENT', 'KONKAI AGENT', 'VAIDAM AGENT', 'PHING AGENT', 'Dr.Monmon'] },
];

export const ALL_SOURCES = Array.from(new Set(PLATFORM_ORDER_MAPPING.flatMap(p => p.sources)));

export const PLATFORMS_LIST = PLATFORM_ORDER_MAPPING.map(p => p.platform);
