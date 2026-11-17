import React, { useMemo, useState } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { showToast, switchTab } from '@/utils/taro';
import { useSessionStore } from '@/store/useSessionStore';
import { useProfileStore } from '@/store/useProfileStore';
import SessionExerciseReview from '@/components/SessionExerciseReview';
import EmptyState from '@/components/EmptyState';
import {
  estimateCaloriesBurned,
  exerciseReports,
  feelMessage,
  feelScoreOutOf100,
  formatVolume,
  sessionComparison
} from '@/utils/workout';
import type { CompareMetric } from '@/utils/workout';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

/** 对比条里的涨跌文案：增长绿色、下降红色、持平灰色 */
function compareDelta(
  metric: CompareMetric,
  unit: string,
  useRatio = false
): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (metric.prev === null) return null;
  const usePercent = useRatio && metric.ratio !== null;
  const value = usePercent ? (metric.ratio as number) : metric.delta ?? 0;
  if (!value) return { text: '持平', tone: 'flat' };
  return {
    text: `${value > 0 ? '+' : '−'}${Math.abs(value)}${usePercent ? '%' : unit}`,
    tone: value > 0 ? 'up' : 'down'
  };
}

/**
 * 训练报告：结束训练后的独立全屏页
 *（总分 + 较上次对比 + 动作复盘 + 消耗热量 + 自我评价）。
 */
const SessionResultPage: React.FC = () => {
  const themeClass = usePageTheme();
  const router = useRouter();
  const sessionId = router.params?.id || '';
  const sessions = useSessionStore((state) => state.sessions);
  const setSessionNote = useSessionStore((state) => state.setSessionNote);
  const updateSessionMeta = useSessionStore((state) => state.updateSessionMeta);
  const profile = useProfileStore((state) => state.profile);

  const session = sessions.find((item) => item.id === sessionId);

  const [selfOpen, setSelfOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  /** 消耗热量输入（选填）；null 表示还没动过，显示已存的值 */
  const [burnText, setBurnText] = useState<string | null>(null);
  /** 热量卡：正在手动输入（点框体或「可修改」进入） */
  const [burnEditing, setBurnEditing] = useState(false);

  /** 训练报告：和上一次同类训练的对比 */
  const comparison = useMemo(
    () => (session ? sessionComparison(session, sessions) : null),
    [session, sessions]
  );
  /** 训练报告：逐动作复盘（同动作同变式才对比） */
  const reports = useMemo(
    () => (session ? exerciseReports(session, sessions) : []),
    [session, sessions]
  );

  /** 复盘里要挂的 PR 徽标，按动作 key 取 */
  const prBadges = useMemo(() => {
    const map: Record<string, string> = {};
    reports.forEach((row) => {
      if (row.isPr && row.prGain) map[row.key] = `PR +${row.prGain}kg`;
    });
    return map;
  }, [reports]);

  if (!session) {
    return (
      <View className={classnames(styles.page, themeClass)}>
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="🔍"
            title="记录不存在"
            desc="这条训练记录可能已被删除"
            actionText="回到主页"
            onAction={() => switchTab({ url: '/pages/home/index' })}
          />
        </View>
      </View>
    );
  }

  /** 估算的热量：按体重 + 训练密度/有氧强度算个建议值 */
  const estimatedBurn = estimateCaloriesBurned(session, profile.weight ?? 0, profile.gender);
  /** 已经确认保存过的值 */
  const savedBurn = session.calories;
  /** 卡片显示的数值：手动改过优先，其次已保存，最后是估算 */
  const burnShown = savedBurn ?? estimatedBurn;
  /** 这个值是估算出来的（还没手动改过） */
  const burnIsEstimate = savedBurn === undefined;
  /** 点框体或「可修改」：进编辑态，直接出光标 */
  const startBurnEdit = () => {
    setBurnText(String(burnShown || ''));
    setBurnEditing(true);
  };
  /** 输入完点「完成」：直接写进这次训练记录，不再单独确认 */
  const finishBurnEdit = () => {
    const num = parseInt(burnText ?? '', 10);
    const value = Number.isFinite(num) && num > 0 ? num : 0;
    updateSessionMeta(session.id, { calories: value > 0 ? value : undefined });
    setBurnEditing(false);
    showToast({ title: value > 0 ? '已记录消耗热量' : '已清除', icon: 'none' });
  };

  /** 要展示的系统评价分数 */
  const displayScore = feelScoreOutOf100(session);
  /** 已经保存过的自我评价 */
  const savedNote = session.selfNote;

  /** 保存自我评价并回主页 */
  const saveNoteAndHome = () => {
    setSessionNote(session.id, noteDraft);
    switchTab({ url: '/pages/home/index' });
  };

  return (
    <View className={classnames(styles.page, themeClass)}>
      {/* 总分 + 一句话评价 */}
      <View className={styles.reportTop}>
        <View
          className={styles.scoreRing}
          style={{
            background: `conic-gradient(#ff8f5c 0%, #ff6b2c ${displayScore ?? 0}%, var(--fl-border) ${
              displayScore ?? 0
            }% 100%)`
          }}
        >
          <View className={styles.scoreRingInner}>
            <Text className={styles.scoreRingNum}>
              {displayScore !== null ? displayScore : '—'}
            </Text>
            <Text className={styles.scoreRingUnit}>/100</Text>
          </View>
        </View>
        <View className={styles.reportTopMain}>
          <Text className={styles.reportMsg}>
            {displayScore !== null
              ? feelMessage(displayScore)
              : '训练完成，干得漂亮！保持这个节奏，继续加油 💪'}
          </Text>
          <View className={styles.reportTags}>
            <Text className={styles.reportTag}>{session.name}</Text>
            {comparison ? (
              <Text className={styles.reportTag}>{comparison.minutes.now} 分钟</Text>
            ) : null}
            <Text className={styles.reportTag}>{reports.length} 个动作</Text>
          </View>
        </View>
      </View>

      {/* 较上次：容量 / 组数 / 时长 / 评分 */}
      {comparison ? (
        <View className={styles.compareCard}>
          <View className={styles.compareHead}>
            <Text className={styles.compareTitle}>较上次</Text>
            <Text className={styles.compareWhen}>
              {comparison.prev
                ? `${dayjs(comparison.prev.startedAt).format('M月D日')} · ${
                    comparison.matchedBy === 'plan' ? '同一计划' : '同名训练'
                  }`
                : '首次完成，下次就有对比了'}
            </Text>
          </View>
          {comparison.prev ? (
            <View className={styles.compareRow}>
              {[
                { label: '总重量', text: formatVolume(comparison.weight.now), delta: compareDelta(comparison.weight, '', true) },
                { label: '完成组', text: `${comparison.sets.now}`, delta: compareDelta(comparison.sets, '组') },
                { label: '时长', text: `${comparison.minutes.now}分`, delta: compareDelta(comparison.minutes, '分') },
                { label: '评分', text: `${comparison.score.now}`, delta: compareDelta(comparison.score, '分') }
              ].map((cell) => (
                <View key={cell.label} className={styles.compareCell}>
                  <Text className={styles.compareLabel}>{cell.label}</Text>
                  <Text className={styles.compareValue}>{cell.text}</Text>
                  <Text
                    className={classnames(
                      styles.compareDelta,
                      cell.delta?.tone === 'up' && styles.compareUp,
                      cell.delta?.tone === 'down' && styles.compareDown
                    )}
                  >
                    {cell.delta ? cell.delta.text : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 动作复盘：按计划详情的排布，逐组展示这次实际练的重量 / 次数 / 状态 */}
      {session.exercises.length ? (
        <View className={styles.reviewCard}>
          <Text className={styles.reviewTitle}>动作复盘</Text>
          <SessionExerciseReview session={session} badges={prBadges} />
        </View>
      ) : null}

      {/* 消耗热量：默认给估算值，点框体或「可修改」直接输入，完成锁定、确认落库 */}
      <View className={styles.burnCard}>
        <View className={styles.burnHead}>
          <Text className={styles.burnIcon}>🔥</Text>
          <Text className={styles.burnLabel}>消耗热量</Text>
        </View>
        {burnEditing ? (
          <View className={styles.burnEditBox}>
            <Input
              className={styles.burnEditInput}
              type="number"
              value={burnText ?? ''}
              focus
              placeholder="0"
              placeholderStyle="color:#4a4a55"
              onInput={(event) => setBurnText(event.detail.value)}
            />
            <Text className={styles.burnUnit}>kcal</Text>
            <Text className={styles.burnDone} onClick={finishBurnEdit}>
              完成
            </Text>
          </View>
        ) : (
          <View className={styles.burnShowBox} onClick={startBurnEdit}>
            <Text className={styles.burnShowText}>
              {burnIsEstimate ? '预估约消耗 ' : '本次消耗 '}
              <Text className={styles.burnShowNum}>{burnShown > 0 ? burnShown : '—'}</Text>
              <Text className={styles.burnShowUnit}> kcal</Text>
            </Text>
            <Text className={styles.burnEdit}>可修改</Text>
          </View>
        )}
      </View>

      {/* 当日计划在日历里看：这里只做提示 */}
      <Text className={styles.dayPlanHint}>查看当日计划可以通过日历点击查看</Text>

      {/* 自我评价 + 回主页 */}
      {selfOpen ? (
        <>
          <Text className={classnames(styles.resultTitle, styles.selfTitle)}>自我评价</Text>
          <Textarea
            className={styles.noteInput}
            value={noteDraft}
            maxlength={200}
            placeholder="写点今天的感受，例如状态、哪里没做好…"
            placeholderStyle="color:#4a4a55"
            onInput={(event) => setNoteDraft(event.detail.value)}
          />
          <View className={styles.notePrimaryBtn} onClick={saveNoteAndHome}>
            <Text className={styles.notePrimaryBtnText}>保存并回到主页</Text>
          </View>
        </>
      ) : (
        <View className={styles.noteActions}>
          <View
            className={styles.noteGhostBtn}
            onClick={() => {
              setNoteDraft(savedNote ?? '');
              setSelfOpen(true);
            }}
          >
            <Text className={styles.noteGhostBtnText}>自我评价</Text>
          </View>
          <View
            className={styles.notePrimaryBtn}
            onClick={() => switchTab({ url: '/pages/home/index' })}
          >
            <Text className={styles.notePrimaryBtnText}>回到主页</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default SessionResultPage;
