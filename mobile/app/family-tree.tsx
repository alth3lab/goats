import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goatsApi } from '@/lib/api';
import { Colors, Spacing, Radius, Typography, Shadows, GenderLabels, StatusLabels, StatusColors } from '@/lib/theme';
import { formatDate } from '@/lib/formatters';

interface TreeNode {
  id: string;
  tagId: string;
  name?: string;
  gender: string;
  status: string;
  birthDate?: string;
  breed?: string;
  motherTagId?: string;
  fatherTagId?: string;
}

export default function FamilyTreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goat, setGoat] = useState<TreeNode | null>(null);
  const [mother, setMother] = useState<TreeNode | null>(null);
  const [father, setFather] = useState<TreeNode | null>(null);
  const [offspring, setOffspring] = useState<TreeNode[]>([]);
  const [siblings, setSiblings] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFamilyTree = useCallback(async () => {
    if (!id) return;
    try {
      const data = await goatsApi.get(id) as Record<string, unknown>;
      const g: TreeNode = {
        id: data.id as string,
        tagId: data.tagId as string,
        name: data.name as string | undefined,
        gender: data.gender as string,
        status: data.status as string,
        birthDate: data.birthDate as string | undefined,
        breed: (data.breed as Record<string, unknown>)?.nameAr as string | undefined,
        motherTagId: data.motherTagId as string | undefined,
        fatherTagId: data.fatherTagId as string | undefined,
      };
      setGoat(g);

      // Load parents
      const allGoats = await goatsApi.list({ limit: '500' });
      const goatList = (allGoats.data || []) as Array<Record<string, unknown>>;

      if (g.motherTagId) {
        const m = goatList.find((x) => x.tagId === g.motherTagId);
        if (m) setMother({ id: m.id as string, tagId: m.tagId as string, name: m.name as string | undefined, gender: m.gender as string, status: m.status as string, birthDate: m.birthDate as string | undefined, breed: (m.breed as Record<string, unknown>)?.nameAr as string | undefined });
      }
      if (g.fatherTagId) {
        const f = goatList.find((x) => x.tagId === g.fatherTagId);
        if (f) setFather({ id: f.id as string, tagId: f.tagId as string, name: f.name as string | undefined, gender: f.gender as string, status: f.status as string, birthDate: f.birthDate as string | undefined, breed: (f.breed as Record<string, unknown>)?.nameAr as string | undefined });
      }

      // Find offspring (animals whose mother or father tag matches this goat)
      const kids = goatList.filter(
        (x) => x.motherTagId === g.tagId || x.fatherTagId === g.tagId
      ).map(x => ({
        id: x.id as string, tagId: x.tagId as string, name: x.name as string | undefined,
        gender: x.gender as string, status: x.status as string,
        birthDate: x.birthDate as string | undefined,
        breed: (x.breed as Record<string, unknown>)?.nameAr as string | undefined,
      }));
      setOffspring(kids);

      // Find siblings (same mother or father)
      if (g.motherTagId || g.fatherTagId) {
        const sibs = goatList.filter(
          (x) => x.id !== g.id && (
            (g.motherTagId && x.motherTagId === g.motherTagId) ||
            (g.fatherTagId && x.fatherTagId === g.fatherTagId)
          )
        ).map(x => ({
          id: x.id as string, tagId: x.tagId as string, name: x.name as string | undefined,
          gender: x.gender as string, status: x.status as string,
          birthDate: x.birthDate as string | undefined,
          breed: (x.breed as Record<string, unknown>)?.nameAr as string | undefined,
        }));
        setSiblings(sibs);
      }
    } catch {
      // Error loading
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadFamilyTree(); }, [loadFamilyTree]);

  const onRefresh = () => { setRefreshing(true); loadFamilyTree(); };

  const navigateToGoat = (goatId: string) => {
    router.push(`/family-tree?id=${goatId}`);
  };

  const AnimalNode = ({ node, relation }: { node: TreeNode; relation: string }) => {
    const isMain = relation === 'main';
    const genderColor = node.gender === 'MALE' ? Colors.male : Colors.female;
    const statusColor = StatusColors[node.status] || Colors.textLight;

    return (
      <TouchableOpacity
        style={[styles.nodeCard, isMain && styles.mainNode]}
        onPress={() => !isMain && navigateToGoat(node.id)}
        activeOpacity={isMain ? 1 : 0.7}
      >
        <View style={[styles.nodeIcon, { backgroundColor: genderColor + '20' }]}>
          <Ionicons name={node.gender === 'MALE' ? 'male' : 'female'} size={isMain ? 24 : 20} color={genderColor} />
        </View>
        <View style={styles.nodeInfo}>
          <View style={styles.nodeHeader}>
            <Text style={[styles.nodeTag, isMain && styles.mainTag]}>{node.tagId}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          {node.name && <Text style={styles.nodeName}>{node.name}</Text>}
          <Text style={styles.nodeRelation}>{relation}</Text>
          <View style={styles.nodeDetails}>
            {node.breed && <Text style={styles.nodeDetail}>{node.breed}</Text>}
            {node.birthDate && <Text style={styles.nodeDetail}>{formatDate(node.birthDate)}</Text>}
          </View>
        </View>
        {!isMain && <Ionicons name="chevron-back" size={16} color={Colors.textLight} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جارٍ تحميل شجرة العائلة...</Text>
      </View>
    );
  }

  if (!goat) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.loadingText}>لم يتم العثور على الحيوان</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>شجرة العائلة</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Parents Section */}
        {(mother || father) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>الوالدين</Text>
            </View>
            <View style={styles.parentsRow}>
              {mother && (
                <View style={styles.parentCol}>
                  <AnimalNode node={mother} relation="الأم" />
                </View>
              )}
              {father && (
                <View style={styles.parentCol}>
                  <AnimalNode node={father} relation="الأب" />
                </View>
              )}
            </View>
            {/* Connector line */}
            <View style={styles.connectorDown}>
              <View style={styles.connectorLine} />
              <Ionicons name="chevron-down" size={16} color={Colors.border} />
            </View>
          </View>
        )}

        {/* Main Animal */}
        <View style={styles.section}>
          <AnimalNode node={goat} relation="main" />
        </View>

        {/* Offspring */}
        {offspring.length > 0 && (
          <View style={styles.section}>
            <View style={styles.connectorDown}>
              <Ionicons name="chevron-down" size={16} color={Colors.border} />
              <View style={styles.connectorLine} />
            </View>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-branch" size={18} color={Colors.success} />
              <Text style={styles.sectionTitle}>النسل ({offspring.length})</Text>
            </View>
            {offspring.map((kid) => (
              <AnimalNode key={kid.id} node={kid} relation={kid.gender === 'MALE' ? 'ابن' : 'ابنة'} />
            ))}
          </View>
        )}

        {/* Siblings */}
        {siblings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-compare" size={18} color={Colors.info} />
              <Text style={styles.sectionTitle}>الأشقاء ({siblings.length})</Text>
            </View>
            {siblings.map((sib) => (
              <AnimalNode key={sib.id} node={sib} relation={sib.gender === 'MALE' ? 'أخ' : 'أخت'} />
            ))}
          </View>
        )}

        {/* Stats Summary */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>ملخص النسب</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{offspring.length}</Text>
              <Text style={styles.statLabel}>أبناء</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{siblings.length}</Text>
              <Text style={styles.statLabel}>أشقاء</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mother ? '✓' : '—'}</Text>
              <Text style={styles.statLabel}>الأم</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{father ? '✓' : '—'}</Text>
              <Text style={styles.statLabel}>الأب</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.lg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...Typography.h4, color: '#fff' },
  content: { padding: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.captionBold, color: Colors.textSecondary },
  parentsRow: { flexDirection: 'row', gap: Spacing.md },
  parentCol: { flex: 1 },
  connectorDown: { alignItems: 'center', marginVertical: Spacing.xs },
  connectorLine: { width: 2, height: 16, backgroundColor: Colors.border },
  nodeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  mainNode: {
    borderWidth: 2, borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08', ...Shadows.md,
  },
  nodeIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  nodeInfo: { flex: 1 },
  nodeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nodeTag: { ...Typography.bodyBold, color: Colors.text },
  mainTag: { ...Typography.h4, color: Colors.primary },
  nodeName: { ...Typography.caption, color: Colors.textSecondary },
  nodeRelation: { ...Typography.small, color: Colors.textLight, marginTop: 2 },
  nodeDetails: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
  nodeDetail: { ...Typography.small, color: Colors.textLight },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.xl, ...Shadows.sm, marginTop: Spacing.lg,
  },
  statsTitle: { ...Typography.captionBold, color: Colors.text, textAlign: 'center', marginBottom: Spacing.lg },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { ...Typography.h3, color: Colors.primary },
  statLabel: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
});
