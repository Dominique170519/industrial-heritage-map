import fs from "fs";

const AMAP_KEY = "c84a3c9428419973263fae4cfaee0312";

interface Site {
  id: string;
  name: string;
  province: string;
  city: string;
  district?: string;
  lat: number;
  lng: number;
  category: string;
  status: string;
  era?: string;
  description?: string;
  images: { url: string; alt: string }[];
  level: string;
  batch: string;
}

async function geocode(address: string, city?: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=${city ? encodeURIComponent(city) : ''}`;

  try {
    const response = await fetch(url);
    const data = await response.json() as { status: string; geocodes: { location: string }[] };

    if (data.status === "1" && data.geocodes && data.geocodes.length > 0) {
      const location = data.geocodes[0].location.split(",");
      if (location.length === 2) {
        return { lng: parseFloat(location[0]), lat: parseFloat(location[1]) };
      }
    }
  } catch (e) {
    console.error(`Error:`, e);
  }
  return null;
}

async function main() {
  const dataPath = "data/sites.json";
  const sites: Site[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // 需要重试的点位 - 使用更简化的查询
  const retryList = [
    { id: "batch1_7", name: "宝鸡申新纱厂", city: "宝鸡市" },
    { id: "batch2_9", name: "开滦唐山矿", city: "唐山市" },
    { id: "batch2_12", name: "阳泉三矿", city: "阳泉市" },
    { id: "batch2_18", name: "茂新面粉厂", city: "无锡市" },
    { id: "batch2_21", name: "泾县宣纸厂", city: "泾县" },
    { id: "batch2_28", name: "铜绿山古铜矿", city: "大冶市" },
    { id: "batch2_37", name: "昆明钢铁厂", city: "安宁市" },
    { id: "batch2_41", name: "刘家峡水电站", city: "永靖县" },
    { id: "batch3_2", name: "度支部印刷局", city: "北京市" },
    { id: "batch3_15", name: "恒顺香醋", city: "镇江市" },
    { id: "batch3_18", name: "古井贡酒", city: "亳州市" },
    { id: "batch3_25", name: "吉州窑", city: "吉安市" },
    { id: "batch3_35", name: "水井街酒坊", city: "成都市" },
    { id: "batch3_45", name: "羊八井地热", city: "当雄县" },
    { id: "batch3_47", name: "蒲城授时台", city: "渭南市" },
    { id: "batch3_48", name: "定边盐场", city: "定边县" },
    { id: "batch4_9", name: "阜新煤炭", city: "阜新市" },
    { id: "batch4_16", name: "北满钢厂", city: "齐齐哈尔市" },
    { id: "batch4_19", name: "常州大明纱厂", city: "常州市" },
    { id: "batch4_29", name: "星火化工厂", city: "九江市" },
    { id: "batch4_39", name: "洛阳铜加工厂", city: "洛阳市" },
    { id: "batch4_49", name: "航空发动机试验基地", city: "江油市" },
    { id: "batch4_59", name: "玉门油田", city: "玉门市" },
    { id: "batch5_7", name: "谢馥春", city: "扬州市" },
    { id: "batch5_17", name: "711铀矿", city: "郴州市" },
    { id: "batch5_27", name: "西安电影制片厂", city: "西安市" },
    { id: "batch6_6", name: "马家坪变电站", city: "阳泉市" },
    { id: "batch6_19", name: "萍乡电瓷", city: "萍乡市" },
    { id: "batch6_22", name: "青岛邮电博物馆", city: "青岛市" },
    { id: "batch6_29", name: "茂名油页岩", city: "茂名市" },
    { id: "batch7_2", name: "二七机车厂", city: "北京市" },
    { id: "batch7_12", name: "丰满水电站", city: "吉林市" },
    { id: "batch7_22", name: "黄埔文冲", city: "广州市" },
    { id: "batch7_31", name: "7107厂", city: "宝鸡市" },
    { id: "js_prov_3", name: "前墅龙窑", city: "宜兴市" },
  ];

  console.log(`Retrying ${retryList.length} sites...`);

  for (const item of retryList) {
    const site = sites.find(s => s.id === item.id);
    if (!site) continue;

    console.log(`Retrying: ${item.name} (${item.city})`);

    // 尝试多种查询方式
    const queries = [
      `${item.city}${item.name}`,
      item.name,
      `${item.city}${item.name.replace(/旧址|厂|矿|站|园|遗址/g, '')}`,
    ];

    let found = false;
    for (const q of queries) {
      const coords = await geocode(q, item.city);
      await new Promise(r => setTimeout(r, 200));

      if (coords) {
        site.lat = coords.lat;
        site.lng = coords.lng;
        console.log(`  ✓ ${q} -> (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`  ✗ Failed`);
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(sites, null, 2), "utf-8");
  console.log("Saved!");
}

main().catch(console.error);
