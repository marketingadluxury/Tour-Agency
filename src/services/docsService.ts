import { supabase } from '@/lib/supabase';
import { SystemDoc, DEFAULT_DOCS, DocCategory, DOC_CATEGORIES } from '@/data/defaultDocs';

const STORAGE_KEY = 'tour_crm_custom_docs';

export const docsService = {
  // Fetch all documents (combining Supabase + fallback default docs)
  async getDocs(): Promise<SystemDoc[]> {
    try {
      const { data, error } = await supabase
        .from('system_docs')
        .select('*')
        .order('order_index', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback to local storage or DEFAULT_DOCS
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch {
            // Ignore parse errors
          }
        }
        return DEFAULT_DOCS;
      }

      return data as SystemDoc[];
    } catch {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // Ignore
        }
      }
      return DEFAULT_DOCS;
    }
  },

  // Save or update a document
  async saveDoc(doc: Partial<SystemDoc> & { title: string; category: string; content: string }): Promise<SystemDoc> {
    const slug = doc.slug || doc.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const docPayload: Partial<SystemDoc> = {
      ...doc,
      slug,
      updated_at: new Date().toISOString(),
      order_index: doc.order_index ?? 99,
      target_roles: doc.target_roles || ['all'],
      author: doc.author || 'Ban Quản Trị',
    };

    try {
      let savedDoc: SystemDoc | null = null;
      if (doc.id && !doc.id.startsWith('doc-temp-')) {
        const { data, error } = await supabase
          .from('system_docs')
          .update(docPayload)
          .eq('id', doc.id)
          .select()
          .single();
        if (!error && data) savedDoc = data as SystemDoc;
      } else {
        const { data, error } = await supabase
          .from('system_docs')
          .insert([{ ...docPayload, created_at: new Date().toISOString() }])
          .select()
          .single();
        if (!error && data) savedDoc = data as SystemDoc;
      }

      if (savedDoc) {
        return savedDoc;
      }
    } catch (e) {
      console.warn('Could not save to Supabase system_docs, caching locally:', e);
    }

    // Fallback: save to localStorage cache
    const current = await this.getDocs();
    const existingIndex = current.findIndex(d => d.id === doc.id || d.slug === slug);
    const fallbackDoc: SystemDoc = {
      id: doc.id || `doc-local-${Date.now()}`,
      slug,
      title: doc.title,
      category: doc.category,
      order_index: doc.order_index ?? 99,
      target_roles: doc.target_roles || ['all'],
      badge: doc.badge,
      summary: doc.summary || '',
      content: doc.content,
      author: doc.author || 'Ban Quản Trị',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    let updatedList: SystemDoc[];
    if (existingIndex >= 0) {
      updatedList = [...current];
      updatedList[existingIndex] = { ...current[existingIndex], ...fallbackDoc };
    } else {
      updatedList = [...current, fallbackDoc];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    return fallbackDoc;
  },

  // Delete a document
  async deleteDoc(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_docs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch {
      // Ignore
    }

    // Update local cache
    const current = await this.getDocs();
    const updated = current.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  },

  getCategories(): DocCategory[] {
    return DOC_CATEGORIES;
  }
};
