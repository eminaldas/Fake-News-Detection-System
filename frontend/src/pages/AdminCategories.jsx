import React, { useState, useEffect, useCallback } from 'react';
import { Tags, Plus, Loader2, Clock } from 'lucide-react';
import axiosInstance from '../api/axios';
import toast from '../services/toast';
import { A, pageWrap, card, cardHead, label, input, btn, ghostBtn, badge } from './adminTheme';

const EMPTY = { slug: '', name: '', parent_id: '', prototype_text: '' };

export default function AdminCategories() {
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/admin/categories');
      setCats(data);
    } catch {
      toast.error('Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mains = cats.filter((c) => !c.parent_id);

  const save = async (e) => {
    e.preventDefault();
    if (!form.slug.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      await axiosInstance.post('/admin/categories', {
        ...form,
        parent_id: form.parent_id || null,
      });
      toast.success('Kategori eklendi, haberler kısa süre içinde buna göre sınıflanacak.');
      setForm(EMPTY);
      load();
    } catch {
      toast.error('Kategori eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    try {
      await axiosInstance.patch(`/admin/categories/${c.id}`, { is_active: !c.is_active });
      load();
    } catch {
      toast.error('Güncellenemedi.');
    }
  };

  return (
    <div style={pageWrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <Tags size={22} color={A.brand} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: A.text1, margin: 0 }}>Kategoriler</h1>
      </div>

      {/* Yeni kategori formu */}
      <form onSubmit={save} style={{ ...card, padding: 0, marginBottom: 24, maxWidth: 720 }}>
        <div style={cardHead}>
          <span style={label}>Yeni kategori / alt kategori</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input
            style={input}
            placeholder="slug (örn: kripto)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            style={input}
            placeholder="Görünen ad (örn: Kripto)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            style={{ ...input, gridColumn: '1 / -1' }}
            value={form.parent_id}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          >
            <option value="">— Ana kategori olarak ekle —</option>
            {mains.map((m) => (
              <option key={m.id} value={m.id}>{m.name} altına</option>
            ))}
          </select>
          <textarea
            style={{ ...input, gridColumn: '1 / -1', minHeight: 70, resize: 'vertical' }}
            placeholder="Bu kategoriyi tanımlayan örnek kelimeler / konu cümlesi (örn: araba otomobil elektrikli araç TOGG motor)"
            value={form.prototype_text}
            onChange={(e) => setForm({ ...form, prototype_text: e.target.value })}
          />
          <button
            type="submit"
            disabled={saving}
            style={{ ...btn(A.brand, A.brandDim), gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
            Kategori ekle
          </button>
        </div>
      </form>

      {/* Liste */}
      {loading ? (
        <div style={{ color: A.text3, fontSize: 13 }}>Yükleniyor…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
          {mains.map((m) => (
            <div key={m.id} style={card}>
              <div style={cardHead}>
                <span style={{ fontSize: 14, fontWeight: 700, color: m.is_active ? A.text1 : A.text3, textDecoration: m.is_active ? 'none' : 'line-through' }}>
                  {m.name}
                </span>
                <button style={ghostBtn} onClick={() => toggleActive(m)}>
                  {m.is_active ? 'Gizle' : 'Göster'}
                </button>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {cats.filter((c) => c.parent_id === m.id).length === 0 && (
                  <span style={{ fontSize: 12, color: A.text3 }}>Alt kategori yok</span>
                )}
                {cats.filter((c) => c.parent_id === m.id).map((s) => (
                  <span
                    key={s.id}
                    onClick={() => toggleActive(s)}
                    title={s.is_active ? 'Gizlemek için tıkla' : 'Göstermek için tıkla'}
                    style={{
                      ...badge(s.is_active ? A.text2 : A.text3, A.card),
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      textDecoration: s.is_active ? 'none' : 'line-through',
                      opacity: s.is_active ? 1 : 0.5,
                    }}
                  >
                    {s.name}
                    {s.is_stale && <Clock size={11} color={A.amber} />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
