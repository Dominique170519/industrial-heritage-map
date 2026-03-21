import fs from "fs";
import path from "path";

interface RawHeritage {
  id: string;
  name: string;
  province: string;
  city: string;
  district: string;
  level: string;
  batch: string;
}

interface SiteRecord {
  id: string;
  name: string;
  province: string;
  city: string;
  district?: string;
  lat: number;
  lng: number;
  category: string;
  status: string;
  era: string;
  description?: string;
  address?: string;
  images: { url: string; alt: string }[];
  visitAccess?: string;
  riskNote?: string;
  level: string;
  batch: string;
}

// 从名称推断类别
function inferCategory(name: string): string {
  const keywords: Record<string, string[]> = {
    "钢铁工业": ["钢铁", "钢", "铁"],
    "纺织工业": ["纱厂", "丝厂", "纺织", "棉", "绸", "绢", "纺"],
    "机械制造": ["机械", "机床", "电机", "锅炉", "变压器", "内燃", "航空", "航天"],
    "电力工业": ["发电", "电厂", "电站", "水电", "火电", "热电"],
    "船舶工业": ["船厂", "造船", "船坞"],
    "电子工业": ["电子", "电管", "电波", "卫星", "雷达", "通讯"],
    "煤炭工业": ["煤矿", "煤", "矿务局"],
    "有色金属": ["钨矿", "铜矿", "锑矿", "汞矿", "铝", "铅", "锌"],
    "化工工业": ["化工", "化肥", "农药", "石油", "炼油"],
    "食品工业": ["酒", "酿", "醋", "酱", "烟", "茶", "糖"],
    "建材工业": ["水泥", "陶瓷", "砖", "瓦"],
    "造纸印刷": ["造纸", "印刷", "造币"],
    "核工业": ["核", "原子能", "铀", "放射性"],
    "航空航天": ["航空", "航天", "火箭", "导弹"],
    "铁路交通": ["铁路", "桥梁", "机车", "车站"],
    "军工国防": ["兵工", "军工", "弹药", "引爆"],
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((w) => name.includes(w))) {
      return category;
    }
  }
  return "其他工业";
}

// 推断开放状态
function inferStatus(level: string): string {
  if (level === "国家级") return "状态未知";
  return "状态未知";
}

// 地理编码请求
async function geocode(
  location: string,
  retries = 2
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    location
  )}&limit=1`;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "IndustrialHeritageMap/1.0 (research project)",
        },
      });

      if (!response.ok) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const data = (await response.json()) as {
        lat: string;
        lon: string;
      }[];

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (e) {
      console.error(`Geocode error for ${location}:`, e);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return null;
}

// 主函数
async function main() {
  const dataPath = "C:/Users/Dominique/Documents/Obsidian Vault/论文研究/02_专题研究/工业遗产地图/00_原始数据/industrial_heritage.json";

  const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as RawHeritage[];

  console.log(`Loaded ${rawData.length} heritage sites`);

  const sites: SiteRecord[] = [];
  let success = 0;
  let failed = 0;

  for (const item of rawData) {
    // 构建查询字符串
    const queryParts = [item.city, item.district, item.name].filter(Boolean);
    const query = queryParts.join(" ");

    console.log(`Geocoding: ${query}`);

    const coords = await geocode(query);

    // 添加延迟避免限流
    await new Promise((r) => setTimeout(r, 1100));

    if (coords) {
      const site: SiteRecord = {
        id: item.id,
        name: item.name,
        province: item.province,
        city: item.city.split("/")[0], // 取第一个城市
        district: item.district?.split("/")[0],
        lat: coords.lat,
        lng: coords.lng,
        category: inferCategory(item.name),
        status: inferStatus(item.level),
        era: item.batch,
        description: `${item.level}工业遗产 - ${item.batch}`,
        images: [{ url: "/covers/factory-default.svg", alt: `${item.name}封面图` }],
        level: item.level,
        batch: item.batch,
      };
      sites.push(site);
      success++;
      console.log(`  ✓ (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    } else {
      failed++;
      console.log(`  ✗ Failed to geocode`);
    }
  }

  console.log(`\nResults: ${success} success, ${failed} failed`);

  // 保存结果
  const outputPath = path.join(process.cwd(), "data", "heritage_batch.json");
  fs.writeFileSync(outputPath, JSON.stringify(sites, null, 2), "utf-8");
  console.log(`Saved to ${outputPath}`);
}

main().catch(console.error);
