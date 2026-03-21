import fs from "fs";

interface RawHeritage {
  id: string;
  name: string;
  province: string;
  city: string;
  district: string;
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

function main() {
  const dataPath = "C:/Users/Dominique/Documents/Obsidian Vault/论文研究/02_专题研究/工业遗产地图/00_原始数据/industrial_heritage.json";

  const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as RawHeritage[];

  console.log(`Loaded ${rawData.length} heritage sites`);

  const sites = rawData.map((item) => ({
    id: item.id,
    name: item.name,
    province: item.province,
    city: item.city.split("/")[0],
    district: item.district?.split("/")[0] || "",
    lat: 0,
    lng: 0,
    category: inferCategory(item.name),
    status: item.level === "国家级" ? "状态未知" : "状态未知",
    era: item.batch,
    description: `${item.level}工业遗产 - ${item.batch}`,
    images: [{ url: "/covers/factory-default.svg", alt: `${item.name}封面图` }],
    level: item.level,
    batch: item.batch,
  }));

  console.log(`Converted ${sites.length} sites`);

  // 保存结果
  const outputPath = "data/heritage_batch.json";
  fs.writeFileSync(outputPath, JSON.stringify(sites, null, 2), "utf-8");
  console.log(`Saved to ${outputPath}`);
}

main();
