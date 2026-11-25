/* ============================================================================
   Part guides — what each component does and how it works.
   Shown when a visitor clicks a part on any 3D aircon (residential,
   commercial / industrial, every model). Keyed by the model part id, with
   per-model overrides as `${kind}:${id}` (e.g. the outdoor "coil" is a
   condenser, the indoor "coil" is an evaporator).
   English + Simplified Chinese; Taglish readers see the English text.
   ============================================================================ */

export interface L {
  en: string;
  zh: string;
}

export interface PartGuide {
  name: L;
  /** One-line role */
  role: L;
  /** How it works, in order */
  steps: L[];
  /** What goes wrong, especially in hot, humid, dusty Pampanga */
  watch: L;
  /** Care / service tip */
  care: L;
}

const g = (
  name: [string, string],
  role: [string, string],
  steps: [string, string][],
  watch: [string, string],
  care: [string, string],
): PartGuide => ({
  name: { en: name[0], zh: name[1] },
  role: { en: role[0], zh: role[1] },
  steps: steps.map(([en, zh]) => ({ en, zh })),
  watch: { en: watch[0], zh: watch[1] },
  care: { en: care[0], zh: care[1] },
});

const EVAPORATOR = g(
  ['Evaporator coil', '蒸发器盘管'],
  ['Takes the heat and humidity out of the room air.', '吸收室内空气中的热量和湿气。'],
  [
    ['Cold, low-pressure liquid refrigerant enters the copper tubes.', '低温低压的液态冷媒进入铜管。'],
    ['Room air blows across the thin aluminium fins; the refrigerant boils and absorbs the heat.', '室内空气吹过薄铝翅片，冷媒蒸发并吸收热量。'],
    ['Moisture in the air condenses on the cold fins and drips into the drain pan.', '空气中的水分在冷翅片上凝结，滴入接水盘。'],
    ['The warmed refrigerant vapour returns to the compressor outdoors.', '吸热后的冷媒气体回到室外的压缩机。'],
  ],
  ['Dust and mould on damp fins block airflow, cause icing and musty smells.', '潮湿翅片上的灰尘和霉菌会阻碍气流，导致结冰和霉味。'],
  ['Chemical coil wash every 3–6 months; never bend the fins.', '每 3–6 个月进行盘管化学清洗；切勿压弯翅片。'],
);

const CONDENSER = g(
  ['Condenser coil', '冷凝器盘管'],
  ['Throws the heat taken from indoors out into the open air.', '把从室内带出的热量排放到室外空气中。'],
  [
    ['Hot, high-pressure refrigerant gas arrives from the compressor.', '高温高压的冷媒气体从压缩机送来。'],
    ['The fan pulls outside air across the fins, carrying the heat away.', '风扇抽吸室外空气流过翅片，把热量带走。'],
    ['As it cools, the refrigerant condenses back into a liquid.', '冷媒冷却后重新凝结成液体。'],
    ['The liquid flows on to the expansion valve and back indoors.', '液态冷媒流向膨胀阀，再回到室内。'],
  ],
  ['Leaves, dust and 36–40 °C afternoon sun raise head pressure and power use.', '落叶、灰尘及 36–40 °C 的午后烈日会提高高压压力和耗电。'],
  ['Rinse from the inside out; keep 30 cm clear around the unit.', '由内向外冲洗；机组四周保持 30 厘米以上的空间。'],
);

const GUIDES: Record<string, PartGuide> = {
  /* ── Indoor parts ── */
  coil: EVAPORATOR,
  condenser: CONDENSER,
  'vrf:coil': CONDENSER,
  'packaged:coil': CONDENSER,
  'outdoor:coil': CONDENSER,

  filter: g(
    ['Air filter', '空气滤网'],
    ['Catches dust, hair and soot before the air reaches the coil.', '在空气到达盘管前拦截灰尘、毛发和烟尘。'],
    [
      ['The fan draws room air in through the filter mesh.', '风扇把室内空气吸入并穿过滤网。'],
      ['Particles are trapped in the fine mesh (some brands add ion or catechin layers).', '颗粒被细密的滤网截留（部分品牌加有离子或儿茶素滤层）。'],
      ['Clean air continues to the evaporator coil.', '洁净的空气继续流向蒸发器盘管。'],
    ],
    ['A clogged filter chokes airflow, raises power use and can freeze the coil.', '滤网堵塞会阻碍气流、增加耗电，并可能导致盘管结冰。'],
    ['Wash with water every 2 weeks; let it dry fully before refitting.', '每 2 周用清水清洗；完全晾干后再装回。'],
  ),
  crossflow: g(
    ['Cross-flow (blower) fan', '贯流风扇（风轮）'],
    ['Moves the air through the unit and blows the cold air into the room.', '推动空气流经机内，并把冷风吹入房间。'],
    [
      ['A long squirrel-cage wheel spins along the width of the unit.', '细长的鼠笼式风轮沿机身宽度方向旋转。'],
      ['Its curved blades pull air through the filter and coil.', '弧形叶片把空气吸过滤网和盘管。'],
      ['The air leaves through the outlet, aimed by the louver.', '空气经出风口送出，由导风板控制方向。'],
    ],
    ['Sticky dust on the blades causes wobble, noise and weak airflow.', '叶片上的黏性灰尘会导致晃动、噪音和风量变弱。'],
    ['Brush and pressure-clean the wheel during a deep cleaning.', '深度清洗时刷洗并加压清洗风轮。'],
  ),
  blower: g(
    ['Blower (centrifugal fan)', '离心风机'],
    ['Pushes air through the coil and into the room or ducts.', '推动空气通过盘管，送入房间或风管。'],
    [
      ['The motor spins a wheel of curved blades inside a scroll housing.', '电机带动蜗壳内的弧形叶轮旋转。'],
      ['Air is drawn into the centre and flung outward at higher pressure.', '空气从中心吸入，以较高压力向外甩出。'],
      ['The pressure carries the air through coils, filters and long ducts.', '这股压力把空气送过盘管、滤网和较长的风管。'],
    ],
    ['Dirt build-up on the blades reduces airflow and unbalances the wheel.', '叶片积尘会减少风量并使叶轮失衡。'],
    ['Clean the wheel and check bearings and belt (if any) yearly.', '每年清洗叶轮，并检查轴承和皮带（如有）。'],
  ),
  motor: g(
    ['Fan motor', '风扇电机'],
    ['Turns the fan at the speed the control board asks for.', '按控制板的指令驱动风扇转动。'],
    [
      ['The board sends power (or a speed signal for DC inverter motors).', '控制板供电（直流变频电机则发送转速信号）。'],
      ['The motor turns the fan shaft — slow for quiet, fast for turbo.', '电机带动风扇轴转动——慢速静音，快速强劲。'],
      ['Sealed bearings keep it running smoothly for years.', '密封轴承让它多年运转顺畅。'],
    ],
    ['Worn bearings or a weak capacitor cause humming, slowing or overheating.', '轴承磨损或电容衰减会导致嗡嗡声、转速变慢或过热。'],
    ['Listen for new noises; have amps and capacitor checked during service.', '留意新出现的噪音；保养时检查电流和电容。'],
  ),
  pcb: g(
    ['Control board (PCB)', '控制板（PCB）'],
    ['The brain: reads sensors and the remote, then runs everything.', '大脑：读取传感器和遥控器信号，控制整机运行。'],
    [
      ['It reads the room sensor and your remote settings.', '读取室温传感器和遥控器的设定。'],
      ['It sets the fan speed, louver swing and compressor speed.', '设定风速、导风板摆动和压缩机转速。'],
      ['It watches for faults and shows an error code if something is wrong.', '监测故障，出现问题时显示故障代码。'],
    ],
    ['Power surges, humidity and insects are the top causes of board failures.', '电涌、潮湿和昆虫是控制板故障的主要原因。'],
    ['Use a dedicated breaker and an AVR or surge protector.', '使用独立断路器以及稳压器或防雷器。'],
  ),
  controls: g(
    ['Control box & inverter board', '电控盒与变频板'],
    ['Drives the compressor and fans and protects the system.', '驱动压缩机和风扇，并保护整个系统。'],
    [
      ['It turns mains power into the variable frequency the compressor needs.', '把市电转换为压缩机所需的可变频率。'],
      ['It speeds the compressor up or down to match the load.', '根据负荷调高或调低压缩机转速。'],
      ['Pressure and temperature sensors let it shut down safely on a fault.', '压力和温度传感器使其在故障时安全停机。'],
    ],
    ['Heat, voltage dips and lizards or insects inside the box cause faults.', '高温、电压骤降以及壁虎或昆虫进入电控盒都会引发故障。'],
    ['Keep the cover sealed; check terminals and error logs during service.', '保持盖板密封；保养时检查接线端子和故障记录。'],
  ),
  drain: g(
    ['Condensate drain pan', '冷凝水接水盘'],
    ['Collects the water wrung out of humid air and sends it outside.', '收集从潮湿空气中析出的水，并排到室外。'],
    [
      ['Water drips off the cold coil into the pan.', '水从冷盘管上滴入接水盘。'],
      ['The pan slopes to an outlet connected to the drain hose.', '接水盘倾斜通向连接排水管的出口。'],
      ['The hose carries the water outdoors by gravity.', '排水管依靠重力把水排到室外。'],
    ],
    ['Slime and algae in the pan or hose cause water to drip indoors.', '接水盘或排水管中的黏液和藻类会导致室内漏水。'],
    ['Flush the drain line at every cleaning; keep the hose sloping down.', '每次清洗时冲洗排水管；保持排水管向下倾斜。'],
  ),
  louver: g(
    ['Swing louver', '摆风导板'],
    ['Aims the cold air up, down or across the room.', '把冷风导向上方、下方或整个房间。'],
    [
      ['A small step motor turns the flap to set angles.', '小型步进电机把导板转到设定角度。'],
      ['In swing mode it sweeps continuously to mix the air.', '摆风模式下持续摆动，使空气混合。'],
      ['Aimed at the ceiling, cold air sinks gently instead of blowing on you.', '导向天花板时，冷风缓缓下沉，不会直吹到人。'],
    ],
    ['A stuck louver usually means a failed step motor or a jammed linkage.', '导板卡住通常是步进电机损坏或连杆卡死。'],
    ['Never force the flap by hand; use the remote.', '切勿用手强行扳动导板；请用遥控器调节。'],
  ),
  panel: g(
    ['Front cover & panel', '前盖与面板'],
    ['Protects the internals and guides the air in and out.', '保护内部零件，并引导进风和出风。'],
    [
      ['Room air enters through the top or front intake.', '室内空气从顶部或前方进风口进入。'],
      ['The shaped cover channels air over the filter and coil.', '造型面板引导空气流过滤网和盘管。'],
      ['It holds the display and the remote-control receiver.', '面板上装有显示屏和遥控接收器。'],
    ],
    ['Sunlight yellows plastic; cracked clips cause rattles.', '阳光会使塑料泛黄；卡扣断裂会产生异响。'],
    ['Wipe with a damp cloth only; open it to reach the filters.', '只用湿布擦拭；打开面板即可取出滤网。'],
  ),
  chassis: g(
    ['Rear chassis & mounting plate', '后底壳与挂板'],
    ['Holds every part in place and hangs the unit level on the wall.', '固定所有零件，并让机身水平挂在墙上。'],
    [
      ['A steel plate is screwed level to the wall first.', '先把钢挂板水平固定在墙上。'],
      ['The chassis hooks onto the plate; pipes exit through the back.', '底壳挂在挂板上；管路从背后穿出。'],
      ['A slight tilt toward the drain side helps the water flow out.', '略向排水一侧倾斜，有助于排水。'],
    ],
    ['A plate that is not level makes water leak from the wrong side.', '挂板不水平会导致水从另一侧漏出。'],
    ['Installers check level and wall strength before mounting.', '安装人员在安装前检查水平度和墙体强度。'],
  ),
  compressor: g(
    ['Compressor', '压缩机'],
    ['The heart of the system: pumps and pressurises the refrigerant.', '系统的心脏：推动冷媒循环并加压。'],
    [
      ['It draws in low-pressure refrigerant vapour from indoors.', '吸入来自室内的低压冷媒气体。'],
      ['A rotary or scroll mechanism squeezes it to high pressure and heat.', '转子或涡旋机构把它压缩成高压高温气体。'],
      ['Inverter models change speed to match the room, saving power.', '变频机型根据房间需求调节转速，更加省电。'],
    ],
    ['Low refrigerant, dirty coils and voltage swings overwork and overheat it.', '冷媒不足、盘管脏污和电压波动会让它超负荷并过热。'],
    ['Keep coils clean and have pressures and amps checked every year.', '保持盘管清洁，每年检查压力和电流。'],
  ),
  fan: g(
    ['Condenser fan', '冷凝器风扇'],
    ['Pulls outdoor air through the condenser to carry the heat away.', '抽吸室外空气流过冷凝器，把热量带走。'],
    [
      ['The motor spins the propeller blades.', '电机带动螺旋桨叶片旋转。'],
      ['Air is drawn across the coil fins and blown out.', '空气被吸过盘管翅片后吹出。'],
      ['Inverter units slow the fan when less cooling is needed.', '变频机组在需要的制冷量较小时降低风扇转速。'],
    ],
    ['Bent blades or worn bearings cause vibration and noise.', '叶片变形或轴承磨损会引起振动和噪音。'],
    ['Keep the guard clear of leaves; check the blades for cracks.', '清除护网上的落叶；检查叶片有无裂纹。'],
  ),
  'cassette:fan': g(
    ['Turbo (centrifugal) fan', '涡轮（离心）风扇'],
    ['Sucks air up through the centre and throws it out of all four sides.', '从中央吸入空气，再从四面送出。'],
    [
      ['Room air rises through the centre grille and filter.', '室内空气经中央格栅和滤网上升。'],
      ['The spinning turbo fan flings it outward through the square coil.', '旋转的涡轮风扇把空气向外甩过方形盘管。'],
      ['Cooled air leaves the four louvers along the ceiling.', '冷却后的空气从四面导风板沿天花送出。'],
    ],
    ['Dust on the blades unbalances the fan and causes noise.', '叶片积尘会使风扇失衡并产生噪音。'],
    ['Clean the fan and drain pan during the 3-month commercial service.', '每 3 个月的商用保养中清洗风扇和接水盘。'],
  ),
  casing: g(
    ['Cabinet / casing', '机柜 / 机壳'],
    ['Encloses and protects the working parts from weather and touch.', '包覆并保护内部部件，防风雨、防触碰。'],
    [
      ['Painted or galvanised steel panels form the frame.', '喷漆或镀锌钢板构成机身框架。'],
      ['Openings and louvers let air in and out where needed.', '开口和百叶让空气在需要的位置进出。'],
      ['Insulation inside stops sweating and noise.', '内部保温层防止凝露并降低噪音。'],
    ],
    ['Rust at the base and loose panels are common near the coast or on roofs.', '在沿海或屋顶，底座生锈和面板松动很常见。'],
    ['Keep panels screwed shut; touch up scratches before they rust.', '保持面板螺丝紧固；划痕生锈前及时补漆。'],
  ),
  'outdoor:casing': g(
    ['Outdoor cabinet', '室外机外壳'],
    ['Weatherproof box that holds the compressor, coil and fan.', '防风雨的机壳，内装压缩机、盘管和风扇。'],
    [
      ['A powder-coated steel shell protects the parts from sun and rain.', '喷粉钢壳保护内部部件免受日晒雨淋。'],
      ['Side and rear openings let air reach the coil.', '侧面和后部开口让空气到达盘管。'],
      ['Rubber feet on a bracket or pad reduce vibration.', '支架或基座上的橡胶脚垫减少振动。'],
    ],
    ['Blocked openings and direct afternoon sun make the unit work harder.', '开口被遮挡和午后直晒会让机组更吃力。'],
    ['Shade it if you can, but never box it in.', '尽量遮阴，但切勿封闭包围。'],
  ),
  ports: g(
    ['Service valves', '检修阀'],
    ['Connect the copper lines and let technicians test and charge the system.', '连接铜管，并供技师检测和充注冷媒。'],
    [
      ['The liquid and gas lines are flared onto brass valves.', '液管和气管以喇叭口连接到黄铜阀上。'],
      ['Gauges connect here to read pressures.', '压力表接在这里读取压力。'],
      ['Valves open after the vacuum test to release the refrigerant.', '抽真空测试后打开阀门，释放冷媒。'],
    ],
    ['Poorly tightened flares leak refrigerant slowly.', '喇叭口未拧紧会导致冷媒缓慢泄漏。'],
    ['Always keep the valve caps on; check for oil stains (a leak sign).', '始终盖好阀帽；检查有无油渍（泄漏迹象）。'],
  ),
  'ducted:ports': g(
    ['Supply-air flange', '送风法兰'],
    ['Connects the unit to the supply ducts.', '把机组连接到送风风管。'],
    [
      ['The blower pushes cooled air out of the flange.', '风机把冷风推出法兰。'],
      ['Insulated ducts carry it above the ceiling.', '保温风管在吊顶内输送冷风。'],
      ['Diffusers spread it into each room.', '散流器把冷风送入各个房间。'],
    ],
    ['Unsealed joints leak cold air and cause ceiling stains.', '接口未密封会漏冷风并造成天花板水渍。'],
    ['Seal joints with foil tape and keep the insulation intact.', '用铝箔胶带密封接口，并保持保温层完整。'],
  ),
  top: g(
    ['Top cover & fan guard', '顶盖与风扇护网'],
    ['Lets hot air out upward while keeping hands and debris away from the fan.', '让热风向上排出，同时防止手和杂物接触风扇。'],
    [
      ['The fan blows heated air straight up through the guard.', '风扇把热风经护网向上直吹。'],
      ['The shroud guides the air so it does not loop back into the coil.', '导流罩引导气流，避免热风回流到盘管。'],
      ['The cover keeps rain off the motor and electronics.', '顶盖为电机和电子部件挡雨。'],
    ],
    ['Leaves and nests on top reduce airflow.', '顶部的落叶和鸟巢会减少风量。'],
    ['Never place anything on top of the unit.', '切勿在机组顶部放置任何物品。'],
  ),
  frame: g(
    ['Base frame & rear panel', '底座与后面板'],
    ['Carries the unit’s weight and stiffens the cabinet.', '承受机组重量并加强机柜刚度。'],
    [
      ['A steel base bolts to the roof dunnage or a concrete pad.', '钢底座用螺栓固定在屋顶钢架或混凝土基座上。'],
      ['Corner posts and the rear panel hold the coil and covers.', '角柱和后面板固定盘管和盖板。'],
      ['Anti-vibration pads stop noise travelling into the building.', '减震垫防止噪音传入建筑。'],
    ],
    ['Corrosion at the base is common on rooftops.', '屋顶机组底座常见锈蚀。'],
    ['Inspect for rust and loose bolts every year.', '每年检查锈蚀和螺栓松动。'],
  ),
  base: g(
    ['Base pan', '底盘'],
    ['Holds the parts and collects condensate in a window unit.', '在窗式空调中固定部件并收集冷凝水。'],
    [
      ['All components bolt to the steel base pan.', '所有部件用螺栓固定在钢制底盘上。'],
      ['Water from the indoor coil runs back along the pan.', '室内盘管的冷凝水沿底盘流向后方。'],
      ['The condenser fan splashes it on the hot coil to help cooling.', '冷凝器风扇把水甩到热盘管上，辅助散热。'],
    ],
    ['Rust and a blocked drain hole cause dripping and smells.', '生锈和排水孔堵塞会导致滴水和异味。'],
    ['Tilt the unit slightly outward and clear the drain hole.', '让机身略向外倾斜，并疏通排水孔。'],
  ),
  grille: g(
    ['Centre intake grille', '中央进风格栅'],
    ['Where room air enters a ceiling cassette.', '天花机吸入室内空气的位置。'],
    [
      ['Air is drawn up through the grille by the turbo fan.', '涡轮风扇把空气经格栅向上吸入。'],
      ['The filter sits just behind it.', '滤网就在格栅后方。'],
      ['The grille swings down so the filter can be cleaned.', '格栅可向下打开以清洗滤网。'],
    ],
    ['Dirty grilles leave grey streaks on the ceiling.', '格栅脏污会在天花板上留下灰色痕迹。'],
    ['Open and wash the grille and filter monthly in busy stores.', '人流量大的商铺每月打开清洗格栅和滤网。'],
  ),
  'cassette:panel': g(
    ['Decoration panel & 4-way louvers', '装饰面板与四向导风板'],
    ['The visible face of a cassette; spreads air in four directions.', '天花机的外露面板，把冷风向四个方向送出。'],
    [
      ['The panel sits flush with the T-bar ceiling.', '面板与 T 型龙骨吊顶齐平。'],
      ['Four motorised flaps aim the air outward and down.', '四片电动导风板把风向外、向下送出。'],
      ['A corner sensor (some models) tracks people and floor temperature.', '角落传感器（部分型号）追踪人员位置和地面温度。'],
    ],
    ['Flaps stuck shut make one side of the room warm.', '导风板卡住关闭会使房间一侧偏热。'],
    ['Wipe the panel; have flap motors tested if one stops moving.', '擦拭面板；若导风板不动，请检查摆风电机。'],
  ),
  'floor:panel': g(
    ['Front panel & display', '前面板与显示屏'],
    ['Covers the tower and shows the set temperature and mode.', '覆盖柜机正面，显示设定温度和模式。'],
    [
      ['Return air enters through the lower grille.', '回风从下部格栅进入。'],
      ['Cold air leaves through the tall upper outlet.', '冷风从上部高出风口送出。'],
      ['The display and touch keys connect to the control board.', '显示屏和触摸按键连接到控制板。'],
    ],
    ['Blocking the lower grille with furniture starves the unit of air.', '家具挡住下部格栅会让机组进风不足。'],
    ['Keep 50 cm clear in front of the tower.', '柜机前方保持 50 厘米以上的空间。'],
  ),
  'window:panel': g(
    ['Front grille & controls', '前格栅与控制面板'],
    ['The room side of a window unit: air in, cold air out, controls.', '窗式空调的室内侧：进风、出冷风及控制。'],
    [
      ['Room air enters through the grille and filter.', '室内空气经格栅和滤网进入。'],
      ['Cold air leaves through the adjustable vanes.', '冷风经可调导风叶送出。'],
      ['Knobs or a digital panel set temperature and fan speed.', '旋钮或数字面板设定温度和风速。'],
    ],
    ['A dirty grille and filter cut cooling noticeably.', '格栅和滤网脏污会明显降低制冷效果。'],
    ['Slide out and wash the filter every 2 weeks.', '每 2 周抽出清洗滤网。'],
  ),
  'vrf:panel': g(
    ['Front service panel', '前检修面板'],
    ['Gives technicians access to the compressor and electronics.', '供技师检修压缩机和电子部件。'],
    [
      ['The lower panel unscrews to reveal the compressor bay.', '拆下下部面板即可看到压缩机舱。'],
      ['A status LED shows that the system is running normally.', '状态指示灯显示系统运行正常。'],
      ['It keeps rain and sun off the inverter board.', '为变频板遮挡雨水和阳光。'],
    ],
    ['Missing screws let water reach the electronics.', '缺少螺丝会让雨水进入电子部件。'],
    ['Always refit every screw after service.', '检修后务必装回所有螺丝。'],
  ),
  'packaged:panel': g(
    ['Hinged access panels', '铰链式检修面板'],
    ['Doors to the blower, filters and controls of a rooftop unit.', '屋顶一体机风机、滤网和电控部分的检修门。'],
    [
      ['Panels open without tools for quick filter changes.', '面板无需工具即可打开，便于快速更换滤网。'],
      ['Gaskets seal them so outdoor air and rain stay out.', '密封条把室外空气和雨水挡在外面。'],
      ['Labels show which section each panel opens.', '标签标明每块面板对应的部分。'],
    ],
    ['Worn gaskets let hot air and water in.', '密封条老化会让热空气和雨水进入。'],
    ['Check gaskets and latches at every quarterly service.', '每季度保养时检查密封条和门锁。'],
  ),
};

/** Guide for a part of a given model kind (kind override first, then the generic part). */
export function guideFor(kind: string, partId: string): PartGuide | null {
  return GUIDES[`${kind}:${partId}`] ?? GUIDES[partId] ?? null;
}
