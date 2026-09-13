import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "./index";
import { materials, modelingTiers, pricingSettings } from "./schema/app";

const DEFAULT_TIERS = [
  { tierName: "有範本可改", defaultPrice: 100, sortOrder: 0 },
  { tierName: "簡單", defaultPrice: 300, sortOrder: 1 },
  { tierName: "中等", defaultPrice: 600, sortOrder: 2 },
  { tierName: "複雜", defaultPrice: 1200, sortOrder: 3 },
] as const;

// 原本寫死在 lib/material-info.ts 的介紹內容，改成 seed 進 DB，之後都在後台維護。
// sortOrder 依常用程度排（PLA/PETG/TPU 最常用）。
const DEFAULT_MATERIALS = [
  {
    name: "PLA",
    isHighTemp: false,
    sortOrder: 0,
    pros: ["好印、翹曲風險低，細節與表面品質佳", "價格便宜、顏色選擇多", "室內擺設、模型類最划算"],
    cons: ["耐熱差，夏天放車內、靠近熱源會軟化變形", "較脆、抗摔抗撞擊能力差", "戶外長期日曬易脆化"],
    goodFor: "公仔、模型、擺飾、原型打樣、室內用小物",
  },
  {
    name: "PETG",
    isHighTemp: false,
    sortOrder: 1,
    pros: ["韌性佳，比 PLA 耐摔耐用", "耐候、耐潮，適合戶外或潮濕環境", "有食品接觸等級的選項"],
    cons: [
      "容易牽絲、噴頭稍微黏料，表面偶爾會有絲狀瑕疵",
      "透明款容易因列印而變霧",
      "略比 PLA 貴一些",
    ],
    goodFor: "戶外用品、水杯/收納盒、需要一定強度的功能性零件",
  },
  {
    name: "TPU（軟性材質）",
    isHighTemp: false,
    sortOrder: 2,
    pros: ["柔軟有彈性，可彎折不易斷", "耐油、耐磨，適合當緩衝/防滑零件"],
    cons: [
      "列印速度要放慢，太快容易擠料失敗",
      "退料/換料容易卡料，對進料機構要求較高",
      "支撐材不好清，複雜幾何形狀較難印",
    ],
    goodFor: "手機殼、防滑墊、減震墊片、需要彈性的零件",
  },
  {
    name: "ABS",
    isHighTemp: true,
    sortOrder: 3,
    pros: [
      "耐熱、耐衝擊，適合會受力或高溫環境的零件",
      "可用丙酮蒸氣拋光成光滑表面",
      "後加工（鑽孔、打磨、上色）容易",
    ],
    cons: ["列印時容易翹曲、需要封閉腔體/熱床", "列印過程有明顯氣味，需要通風", "對新手不友善，失敗率較高"],
    goodFor: "汽機車零件、電器外殼、需要耐熱耐摔的功能性零件",
  },
  {
    name: "PC（聚碳酸酯）",
    isHighTemp: true,
    sortOrder: 4,
    pros: ["強度、耐衝擊、耐熱性極佳", "透光度好，可做半透明/透明零件"],
    cons: [
      "需要很高的列印溫度與乾燥的線材，對機器要求高",
      "容易吸濕，開封後要盡快用完或除濕保存",
      "翹曲問題比 ABS 更明顯，失敗率高",
    ],
    goodFor: "高強度結構件、需要耐高溫的零件、對透光有需求的零件",
  },
  {
    name: "Nylon（尼龍）",
    isHighTemp: true,
    sortOrder: 5,
    pros: ["極佳的韌性與耐疲勞性，耐反覆彎折不易斷裂", "耐磨耗，適合會摩擦滑動的零件"],
    cons: ["吸濕性非常強，沒烘乾直接印品質會很差", "翹曲嚴重、列印難度高，對新手不友善", "價格較高"],
    goodFor: "齒輪、鉸鏈、卡榫等需要耐磨耐疲勞的機構零件",
  },
  {
    name: "其他特殊材質",
    isHighTemp: false,
    sortOrder: 6,
    pros: ["依材質特性而定，可能有特殊外觀、質感或強度需求"],
    cons: ["通常對噴頭/機器有額外要求（例如碳纖維需要硬化噴頭）", "價格較高，列印參數需要個別調整"],
    goodFor: "有特殊外觀或性能需求，且不介意額外溝通討論的案子",
  },
];

async function seed() {
  const [existingSettings] = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.id, "default"));
  if (!existingSettings) {
    await db.insert(pricingSettings).values({ id: "default" });
    console.log("[seed] created default pricing_settings row");
  } else {
    console.log("[seed] pricing_settings already exists, skipping");
  }

  const existingTiers = await db.select().from(modelingTiers);
  if (existingTiers.length === 0) {
    await db.insert(modelingTiers).values([...DEFAULT_TIERS]);
    console.log(`[seed] created ${DEFAULT_TIERS.length} default modeling_tiers rows`);
  } else {
    console.log(`[seed] modeling_tiers already has ${existingTiers.length} row(s), skipping`);
  }

  const existingMaterials = await db.select().from(materials);
  if (existingMaterials.length === 0) {
    await db.insert(materials).values(DEFAULT_MATERIALS);
    console.log(`[seed] created ${DEFAULT_MATERIALS.length} default materials rows`);
  } else {
    console.log(`[seed] materials already has ${existingMaterials.length} row(s), skipping`);
  }
}

seed()
  .then(() => {
    console.log("[seed] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exit(1);
  });
