import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Input, ScrollView, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { DietEntry, DietDay, FoodCategory, FoodItem, MealKey } from '@/types';
import { FOOD_CATEGORIES, FOOD_CATEGORY_LABELS, MEAL_LABELS } from '@/constants';
import { PRESET_FOODS, findFood, foodIcon, foodPhoto } from '@/data/foods';
import { useDietStore } from '@/store/useDietStore';
import { useKeyboardHeight } from '@/utils/keyboard';
import { showToast } from '@/utils/taro';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

/** 食物分类侧栏 key */
type RailKey = 'common' | 'custom' | FoodCategory;

const RAILS: { key: RailKey; label: string }[] = [
  { key: 'common', label: '常见' },
  { key: 'custom', label: '自定义' },
  ...FOOD_CATEGORIES.map((key) => ({ key, label: FOOD_CATEGORY_LABELS[key] }))
];

/** 按克数换算营养 */
function nutritionOf(food: FoodItem, grams: number) {
  const ratio = grams / 100;
  const round = (value: number) => Math.round(value * ratio * 10) / 10;
  return {
    kcal: round(food.kcal),
    protein: round(food.protein),
    carb: round(food.carb),
    fat: round(food.fat),
    fiber: round(food.fiber),
    sodium: Math.round(food.sodium * ratio)
  };
}

function entryOf(food: FoodItem, grams: number): Omit<DietEntry, 'id'> {
  return {
    foodId: food.id,
    name: food.name,
    grams,
    ...nutritionOf(food, grams)
  };
}

/** 默认记录份量：统一按 100g */
const DEFAULT_GRAMS = 100;

/** 展示图：自定义拍照 > 预置实拍图；都没有就走图标 */
function photoOf(food: FoodItem): string {
  return food.image || foodPhoto(food) || '';
}

/** 全屏选食物页（独立页面，右滑/完成返回单餐页） */
const FoodPickerPage: React.FC = () => {
  const themeClass = usePageTheme();
  const router = useRouter();
  const date = router.params?.date || dayjs().format('YYYY-MM-DD');
  const rawMeal = (router.params?.meal || 'breakfast') as MealKey;
  const meal: MealKey = MEAL_LABELS[rawMeal] ? rawMeal : 'breakfast';

  const customFoods = useDietStore((state) => state.customFoods);
  const days = useDietStore((state) => state.days);
  const addEntry = useDietStore((state) => state.addEntry);
  const updateEntry = useDietStore((state) => state.updateEntry);
  const copyYesterday = useDietStore((state) => state.copyYesterday);
  const addCustomFood = useDietStore((state) => state.addCustomFood);
  const keyboardHeight = useKeyboardHeight();

  const [rail, setRail] = useState<RailKey>('common');
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState('100');
  /** 编辑已有记录：不为空时 confirmAdd 会 updateEntry 而不是 addEntry */
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'other' as FoodCategory,
    kcal: '',
    protein: '',
    carb: '',
    fat: '',
    fiber: '',
    sodium: '',
    image: ''
  });

  /** 从单餐页点食物进来时，自动打开该食物的详情弹层，带上当前克数 */
  useEffect(() => {
    const entryId = router.params?.entryId;
    const foodId = router.params?.foodId;
    const gramsParam = router.params?.grams;
    if (entryId && foodId) {
      const food = findFood(foodId, [...customFoods, ...PRESET_FOODS]);
      if (food) {
        setDetail(food);
        setGrams(gramsParam || '100');
        setEditEntryId(entryId);
      }
    }
  }, [router.params?.entryId, router.params?.foodId, router.params?.grams, customFoods]);

  const allFoods = useMemo(() => [...customFoods, ...PRESET_FOODS], [customFoods]);

  const foodList = useMemo(() => {
    const text = keyword.trim();
    return allFoods.filter((item) => {
      const okRail =
        rail === 'common'
          ? true
          : rail === 'custom'
            ? Boolean(item.isCustom)
            : item.category === rail;
      const okText = !text || item.name.includes(text);
      return okRail && okText;
    });
  }, [allFoods, rail, keyword]);

  /** 列表分批渲染：食物库变多以后一次铺开会卡，滚到底再加一批 */
  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [rail, keyword]);
  const visibleFoods = useMemo(
    () => foodList.slice(0, visibleCount),
    [foodList, visibleCount]
  );

  /** 底部「已选数量」跟随这一餐实时变化 */
  const mealEntries = days[date]?.meals?.[meal] ?? [];
  const dateLabel = dayjs(date).format('M月D日');

  const goBack = () => Taro.navigateBack();

  const openDetail = (food: FoodItem) => {
    setDetail(food);
    setGrams(String(DEFAULT_GRAMS));
    setEditEntryId(null);
  };

  const confirmAdd = () => {
    if (!detail) return;
    const value = Number(grams);
    if (!Number.isFinite(value) || value <= 0) {
      showToast({ title: '先填克数', icon: 'none' });
      return;
    }
    const entry = entryOf(detail, value);
    if (editEntryId) {
      updateEntry(date, meal, editEntryId, entry);
    } else {
      addEntry(date, meal, entry);
    }
    setDetail(null);
    setEditEntryId(null);
  };

  const quickAdd = (food: FoodItem) => {
    addEntry(date, meal, entryOf(food, DEFAULT_GRAMS));
  };

  const pickPhoto = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1, sourceType: ['camera', 'album'] });
      const temp = res.tempFilePaths?.[0];
      if (!temp) return;
      const saved = await Taro.saveFile({ tempFilePath: temp });
      setForm((prev) => ({ ...prev, image: saved.savedFilePath }));
    } catch (error) {
      console.error('[Diet] 选图失败', error);
    }
  };

  const saveCustomFood = () => {
    const name = form.name.trim();
    const kcal = Number(form.kcal);
    if (!name) {
      showToast({ title: '先填食物名称', icon: 'none' });
      return;
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      showToast({ title: '热量要填数字', icon: 'none' });
      return;
    }
    const food = addCustomFood({
      name,
      category: form.category,
      kcal,
      protein: Number(form.protein) || 0,
      carb: Number(form.carb) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      sodium: Number(form.sodium) || 0,
      image: form.image || undefined
    });
    setCustomOpen(false);
    setForm({
      name: '',
      category: 'other',
      kcal: '',
      protein: '',
      carb: '',
      fat: '',
      fiber: '',
      sodium: '',
      image: ''
    });
    setRail('custom');
    openDetail(food);
  };

  const detailNutrition = detail ? nutritionOf(detail, Number(grams) || 0) : null;

  return (
    <View className={classnames(styles.page, themeClass)}>
      <View className={styles.pickPanel}>
        <View className={styles.pickHead}>
          <Text className={styles.pickBack} onClick={goBack}>
            ‹
          </Text>
          <Text className={styles.pickTitle}>
            {dateLabel} 添加{MEAL_LABELS[meal]}
          </Text>
          <Text className={styles.pickCustom} onClick={() => setCustomOpen(true)}>
            ＋ 自定义
          </Text>
        </View>

        <View className={styles.searchWrap}>
          <Input
            className={styles.search}
            value={keyword}
            placeholder="请输入食物名称"
            placeholderStyle="color:#6f6f7d"
            confirmType="search"
            adjustPosition={false}
            onInput={(event) => setKeyword(event.detail.value)}
          />
        </View>

        <View className={styles.quickRow}>
          <View className={styles.quickBtn} onClick={() => copyYesterday(date)}>
            <Text className={styles.quickText}>复制记录</Text>
          </View>
          <View className={styles.quickBtn} onClick={() => setCustomOpen(true)}>
            <Text className={styles.quickText}>快速记录</Text>
          </View>
        </View>

        <View className={styles.pickBody}>
          <ScrollView scrollY className={styles.rail}>
            {RAILS.map((item) => (
              <View
                key={item.key}
                className={classnames(styles.railItem, rail === item.key && styles.railActive)}
                onClick={() => setRail(item.key)}
              >
                <Text
                  className={classnames(
                    styles.railText,
                    rail === item.key && styles.railTextActive
                  )}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View className={styles.foodPane}>
            <View className={styles.paneHead}>
              <Text className={styles.paneTitle}>
                {rail === 'common' ? '常见食物' : RAILS.find((item) => item.key === rail)?.label}
              </Text>
              <Text className={styles.paneCount}>{foodList.length} 种</Text>
            </View>
            <ScrollView
              scrollY
              className={styles.foodList}
              lowerThreshold={120}
              onScrollToLower={() =>
                setVisibleCount((count) =>
                  count < foodList.length ? count + PAGE_SIZE : count
                )
              }
            >
              {foodList.length ? (
                visibleFoods.map((food) => {
                  const photo = photoOf(food);
                  return (
                    <View key={food.id} className={styles.foodRow} onClick={() => openDetail(food)}>
                      {photo ? (
                        <Image className={styles.foodImg} src={photo} mode="aspectFill" />
                      ) : (
                        <View className={styles.foodIcon}>
                          <Image
                            className={styles.foodIconImg}
                            src={foodIcon(food)}
                            mode="aspectFit"
                          />
                        </View>
                      )}
                      <View className={styles.foodMain}>
                        <Text className={styles.foodName}>{food.name}</Text>
                        <Text className={styles.foodKcal}>
                          {Math.round(food.kcal)} 千卡/{DEFAULT_GRAMS}克
                        </Text>
                      </View>
                      <View
                        className={styles.foodAdd}
                        onClick={(event) => {
                          event.stopPropagation();
                          quickAdd(food);
                        }}
                      >
                        <Text className={styles.foodAddText}>＋</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className={styles.emptyTip}>
                  <Text className={styles.emptyText}>
                    {rail === 'custom' ? '还没有自定义食物' : '没有找到，试试「＋ 自定义」'}
                  </Text>
                </View>
              )}
              {visibleCount < foodList.length ? (
                <View
                  className={styles.loadMore}
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  <Text className={styles.loadMoreText}>
                    还有 {foodList.length - visibleCount} 种 · 点击加载更多
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>

        {/* 底部：已选数量 + 完成 */}
        <View className={styles.pickFooter}>
          <Text className={styles.pickFooterText}>
            添加{MEAL_LABELS[meal]} · {mealEntries.length}
          </Text>
          <View className={styles.pickDone} onClick={goBack}>
            <Text className={styles.pickDoneText}>完成</Text>
          </View>
        </View>
      </View>

      {/* 食物详情：克数 + 五项营养 */}
      {detail && detailNutrition ? (
        <View
          className={styles.detailMask}
          style={{ paddingBottom: `${keyboardHeight}px` }}
          onClick={() => setDetail(null)}
        >
          <View className={styles.detailCard} onClick={(event) => event.stopPropagation()}>
            <View className={styles.detailHead}>
              {photoOf(detail) ? (
                <Image className={styles.detailImg} src={photoOf(detail)} mode="aspectFill" />
              ) : (
                <View className={styles.detailIcon}>
                  <Image
                    className={styles.detailIconImg}
                    src={foodIcon(detail)}
                    mode="aspectFit"
                  />
                </View>
              )}
              <View className={styles.detailHeadMain}>
                <Text className={styles.detailName}>{detail.name}</Text>
                <Text className={styles.detailKcal}>
                  {Math.round(detailNutrition.kcal)} 千卡 · {grams || 0} 克
                </Text>
              </View>
              <Text className={styles.detailClose} onClick={() => setDetail(null)}>
                ✕
              </Text>
            </View>

            <View className={styles.nutrientGrid}>
              <View className={styles.nutrient}>
                <View className={styles.nutrientTop}>
                  <View className={classnames(styles.dot, styles.dotCarb)} />
                  <Text className={styles.nutrientLabel}>碳水</Text>
                </View>
                <Text className={styles.nutrientValue}>{detailNutrition.carb} g</Text>
              </View>
              <View className={styles.nutrient}>
                <View className={styles.nutrientTop}>
                  <View className={classnames(styles.dot, styles.dotProtein)} />
                  <Text className={styles.nutrientLabel}>蛋白质</Text>
                </View>
                <Text className={styles.nutrientValue}>{detailNutrition.protein} g</Text>
              </View>
              <View className={styles.nutrient}>
                <View className={styles.nutrientTop}>
                  <View className={classnames(styles.dot, styles.dotFat)} />
                  <Text className={styles.nutrientLabel}>脂肪</Text>
                </View>
                <Text className={styles.nutrientValue}>{detailNutrition.fat} g</Text>
              </View>
              <View className={styles.nutrient}>
                <View className={styles.nutrientTop}>
                  <View className={classnames(styles.dot, styles.dotFiber)} />
                  <Text className={styles.nutrientLabel}>膳食纤维</Text>
                </View>
                <Text className={styles.nutrientValue}>{detailNutrition.fiber} g</Text>
              </View>
              <View className={styles.nutrient}>
                <View className={styles.nutrientTop}>
                  <View className={classnames(styles.dot, styles.dotSodium)} />
                  <Text className={styles.nutrientLabel}>钠</Text>
                </View>
                <Text className={styles.nutrientValue}>{detailNutrition.sodium} mg</Text>
              </View>
            </View>

            <View className={styles.gramsRow}>
              <Text className={styles.gramsLabel}>食用量</Text>
              <View className={styles.gramsBox}>
                <Input
                  className={styles.gramsInput}
                  type="digit"
                  value={grams}
                  adjustPosition={false}
                  onInput={(event) => setGrams(event.detail.value)}
                />
                <Text className={styles.gramsUnit}>克</Text>
              </View>
            </View>

            <View className={styles.detailActions}>
              <Text className={styles.detailCancel} onClick={() => setDetail(null)}>
                取消
              </Text>
              <View className={styles.detailSave} onClick={confirmAdd}>
                <Text className={styles.detailSaveText}>保存</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* 自定义食物表单 */}
      {customOpen ? (
        <View
          className={styles.customMask}
          style={{ paddingBottom: `${keyboardHeight}px` }}
          onClick={() => setCustomOpen(false)}
        >
          <View
            className={styles.customCard}
            style={{ maxHeight: `calc(86vh - ${keyboardHeight}px)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <Text className={styles.customTitle}>新建自定义食物</Text>
            <Text className={styles.customHint}>营养按每 100g 填，记录时按克数自动换算</Text>

            <ScrollView scrollY className={styles.customBody}>
              <Input
                className={styles.customInput}
                value={form.name}
                placeholder="食物名称，例如：自制鸡胸沙拉"
                placeholderStyle="color:#6f6f7d"
                adjustPosition={false}
                onInput={(event) => setForm((prev) => ({ ...prev, name: event.detail.value }))}
              />

              <View className={styles.customChips}>
                {FOOD_CATEGORIES.map((key) => (
                  <View
                    key={key}
                    className={classnames(
                      styles.customChip,
                      form.category === key && styles.customChipActive
                    )}
                    onClick={() => setForm((prev) => ({ ...prev, category: key }))}
                  >
                    <Text
                      className={classnames(
                        styles.customChipText,
                        form.category === key && styles.customChipTextActive
                      )}
                    >
                      {FOOD_CATEGORY_LABELS[key]}
                    </Text>
                  </View>
                ))}
              </View>

              <View className={styles.customGrid}>
                <View className={styles.customField}>
                  <Text className={styles.customLabel}>热量 kcal</Text>
                  <Input
                    className={styles.customInput}
                    type="digit"
                    value={form.kcal}
                    placeholder="0"
                    placeholderStyle="color:#4a4a55"
                    adjustPosition={false}
                    onInput={(event) =>
                      setForm((prev) => ({ ...prev, kcal: event.detail.value }))
                    }
                  />
                </View>
                <View className={styles.customField}>
                  <Text className={styles.customLabel}>碳水 g</Text>
                  <Input
                    className={styles.customInput}
                    type="digit"
                    value={form.carb}
                    placeholder="0"
                    placeholderStyle="color:#4a4a55"
                    adjustPosition={false}
                    onInput={(event) =>
                      setForm((prev) => ({ ...prev, carb: event.detail.value }))
                    }
                  />
                </View>
                <View className={styles.customField}>
                  <Text className={styles.customLabel}>蛋白质 g</Text>
                  <Input
                    className={styles.customInput}
                    type="digit"
                    value={form.protein}
                    placeholder="0"
                    placeholderStyle="color:#4a4a55"
                    adjustPosition={false}
                    onInput={(event) =>
                      setForm((prev) => ({ ...prev, protein: event.detail.value }))
                    }
                  />
                </View>
                <View className={styles.customField}>
                  <Text className={styles.customLabel}>脂肪 g</Text>
                  <Input
                    className={styles.customInput}
                    type="digit"
                    value={form.fat}
                    placeholder="0"
                    placeholderStyle="color:#4a4a55"
                    adjustPosition={false}
                    onInput={(event) =>
                      setForm((prev) => ({ ...prev, fat: event.detail.value }))
                    }
                  />
                </View>
                <View className={styles.customField}>
                  <Text className={styles.customLabel}>膳食纤维 g</Text>
                  <Input
                    className={styles.customInput}
                    type="digit"
                    value={form.fiber}
                    placeholder="0"
                    placeholderStyle="color:#4a4a55"
                    adjustPosition={false}
                    onInput={(event) =>
                      setForm((prev) => ({ ...prev, fiber: event.detail.value }))
                    }
                  />
                </View>
                <View className={styles.customField}>
                  <Text className={styles.customLabel}>钠 mg</Text>
                  <Input
                    className={styles.customInput}
                    type="digit"
                    value={form.sodium}
                    placeholder="0"
                    placeholderStyle="color:#4a4a55"
                    adjustPosition={false}
                    onInput={(event) =>
                      setForm((prev) => ({ ...prev, sodium: event.detail.value }))
                    }
                  />
                </View>
              </View>

              <View className={styles.customRow}>
                <View className={styles.photoBtn} onClick={pickPhoto}>
                  <Text className={styles.photoText}>{form.image ? '重新拍照' : '拍照'}</Text>
                </View>
              </View>
              {form.image ? (
                <Image className={styles.preview} src={form.image} mode="aspectFill" />
              ) : null}
            </ScrollView>

            <View className={styles.customActions}>
              <Text className={styles.customCancel} onClick={() => setCustomOpen(false)}>
                取消
              </Text>
              <View className={styles.customSave} onClick={saveCustomFood}>
                <Text className={styles.customSaveText}>保存并添加</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default FoodPickerPage;
