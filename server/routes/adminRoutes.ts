import express from 'express';
import { getAdminSupabaseClient } from '../services/supabaseService.js';

const router = express.Router();

// Admin API: Get all user profiles
router.get(['/admin/users', '/api/admin/users'], async (req, res) => {
  try {
    const supabaseAdmin = getAdminSupabaseClient(req);
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin API] Lỗi lấy danh sách profiles:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    // Try fetching Auth users list to map emails
    let authUserEmailMap: Record<string, string> = {};
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        if (authData && Array.isArray((authData as any).users)) {
          (authData as any).users.forEach((u: any) => {
            if (u && u.id && u.email) {
              authUserEmailMap[u.id] = u.email;
            }
          });
        }
      }
    } catch (authErr) {
      console.warn('[Admin API] Không thể lấy listUsers từ Auth Admin API:', authErr);
    }

    const enrichedProfiles = (profiles || []).map(p => {
      let email = p.email || authUserEmailMap[p.id];
      if (!email) {
        if (p.id === 'admin-default-1' || p.id === 'admin-default-2') email = 'admin@yourcompany.com';
        else if (p.full_name) {
          // Generate a sensible default email identifier based on name
          const slug = p.full_name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          email = `${slug}@yourcompany.com`;
        } else {
          email = 'user@yourcompany.com';
        }
      }

      // If database profile didn't have email stored, backfill it in background
      if (!p.email && email && p.id) {
        Promise.resolve(supabaseAdmin.from('profiles').update({ email }).eq('id', p.id)).catch(() => {});
      }

      return {
        ...p,
        email
      };
    });

    res.json(enrichedProfiles);
  } catch (error: any) {
    console.error('Lỗi API GET /api/admin/users:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi lấy danh sách người dùng' });
  }
});

// Admin API: Create user profile
router.post(['/admin/users', '/api/admin/users'], async (req, res) => {
  try {
    const { email, password, full_name, phone, company_name, role, leader_id, team_id, team_name, employment_status, resigned_at, resigned_note, join_date } = req.body;
    if (!email || !full_name) {
      res.status(400).json({ error: 'Email và Họ tên không được để trống' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    let createdUserId = '';

    // Create auth user if service role key available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && password) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name }
        });
        if (authError) {
          console.warn('[Admin API] Không thể tạo auth user tự động:', authError.message);
        } else if (authData?.user?.id) {
          createdUserId = authData.user.id;
        }
      } catch (authErr: any) {
        console.warn('[Admin API] Lỗi khi tạo Auth User:', authErr.message || authErr);
      }
    }

    if (!createdUserId) {
      createdUserId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    const profileData: any = {
      id: createdUserId,
      email,
      full_name,
      phone: phone || '',
      company_name: company_name || 'Tour CRM',
      role: role || 'agent',
      leader_id: leader_id || null,
      team_id: team_id || null,
      team_name: team_name || null,
      employment_status: employment_status || 'official',
      resigned_at: employment_status === 'resigned' ? (resigned_at || new Date().toISOString()) : null,
      resigned_note: resigned_note || null,
      join_date: join_date || null,
      created_at: new Date().toISOString()
    };

    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('[Admin API] Lỗi khi tạo/lưu profile:', profileError);
      res.status(500).json({ error: 'Lỗi khi lưu thông tin người dùng: ' + profileError.message });
      return;
    }

    res.json({ success: true, user: newProfile });
  } catch (error: any) {
    console.error('Lỗi API POST /api/admin/users:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi tạo người dùng' });
  }
});

// Admin API: Update user profile
router.put(['/admin/users/:id', '/api/admin/users/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, phone, company_name, role, leader_id, team_id, team_name, employment_status, resigned_at, resigned_note, join_date, password } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Thiếu ID người dùng' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (role !== undefined) updateData.role = role;
    if (leader_id !== undefined) updateData.leader_id = leader_id || null;
    if (team_id !== undefined) updateData.team_id = team_id || null;
    if (team_name !== undefined) updateData.team_name = team_name || null;
    if (join_date !== undefined) updateData.join_date = join_date || null;
    if (employment_status !== undefined) {
      updateData.employment_status = employment_status;
      if (employment_status === 'resigned') {
        updateData.resigned_at = resigned_at || new Date().toISOString();
        if (resigned_note !== undefined) updateData.resigned_note = resigned_note;
      } else {
        updateData.resigned_at = null;
        if (resigned_note !== undefined) updateData.resigned_note = resigned_note;
      }
    }
    if (resigned_at !== undefined && employment_status === 'resigned') updateData.resigned_at = resigned_at;
    if (resigned_note !== undefined) updateData.resigned_note = resigned_note;

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Admin API] Lỗi khi cập nhật profile:', updateError);
      res.status(500).json({ error: updateError.message });
      return;
    }

    // Update password if provided & service role key is available
    if (password && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(id, { password });
      } catch (pwErr: any) {
        console.warn('[Admin API] Không thể đổi mật khẩu Auth:', pwErr.message || pwErr);
      }
    }

    res.json({ success: true, user: updatedProfile });
  } catch (error: any) {
    console.error('Lỗi API PUT /api/admin/users/:id:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi cập nhật người dùng' });
  }
});

// Admin API: Delete user profile by ID param
router.delete(['/admin/users/:id', '/api/admin/users/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Thiếu ID người dùng cần xóa' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('[Admin API] Lỗi khi xóa profile:', profileError);
      res.status(500).json({ error: profileError.message });
      return;
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(id);
      } catch (authErr: any) {
        console.warn('[Admin API] Cảnh báo khi xóa Auth User:', authErr.message || authErr);
      }
    }

    res.json({ success: true, message: 'Đã xóa người dùng thành công' });
  } catch (error: any) {
    console.error('Lỗi API DELETE /api/admin/users/:id:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi xóa người dùng' });
  }
});

// Admin API: Delete user profile
router.delete(['/admin/delete-user', '/api/admin/delete-user'], async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Thiếu ID người dùng cần xóa' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('[Admin API] Lỗi khi xóa profile:', profileError);
      res.status(500).json({ error: 'Không thể xóa hồ sơ người dùng: ' + profileError.message });
      return;
    }

    // Delete auth user if service role key available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.warn('[Admin API] Cảnh báo khi xóa Auth User:', authError.message);
        }
      } catch (authErr: any) {
        console.warn('[Admin API] Không thể xóa Auth User trong Supabase Auth:', authErr.message || authErr);
      }
    }

    res.json({ success: true, message: 'Đã xóa người dùng thành công' });
  } catch (error: any) {
    console.error('Lỗi API /api/admin/delete-user:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi xóa người dùng' });
  }
});

// Admin API: Toggle active status
router.post(['/admin/toggle-active', '/api/admin/toggle-active'], async (req, res) => {
  try {
    const { userId, isActive } = req.body;
    if (!userId || typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'Thiếu thông tin người dùng hoặc trạng thái mới' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (profileError) {
      console.error('[Admin API] Lỗi khi cập nhật is_active profile:', profileError);
      res.status(500).json({ error: 'Không thể cập nhật trạng thái: ' + profileError.message });
      return;
    }

    res.json({ success: true, message: 'Cập nhật trạng thái người dùng thành công' });
  } catch (error: any) {
    console.error('Lỗi API /api/admin/toggle-active:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống khi cập nhật trạng thái' });
  }
});

// Teams API
router.get(['/teams', '/api/teams', '/admin/teams', '/api/admin/teams'], async (req, res) => {
  try {
    const supabaseAdmin = getAdminSupabaseClient(req);
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .order('name');

    if (teamsError) {
      console.error('[Teams API] Lỗi khi lấy danh sách nhóm:', teamsError);
      res.status(500).json({ error: teamsError.message });
      return;
    }

    res.json({ teams: teams || [] });
  } catch (error: any) {
    console.error('[Teams API] Lỗi hệ thống:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

router.post(['/teams', '/api/teams', '/admin/teams', '/api/admin/teams'], async (req, res) => {
  try {
    const { name, leader_id, description, member_ids } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Tên nhóm không được để trống' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: name.trim(),
        leader_id: leader_id || null,
        description: description || null
      })
      .select()
      .single();

    if (teamError) {
      console.error('[Teams API] Lỗi khi tạo nhóm mới:', teamError);
      res.status(500).json({ error: teamError.message });
      return;
    }

    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ team_id: team.id })
        .in('id', member_ids);

      if (updateError) {
        console.warn('[Teams API] Cảnh báo khi gán thành viên vào nhóm:', updateError.message);
      }
    }

    res.json({ success: true, team });
  } catch (error: any) {
    console.error('[Teams API] Lỗi hệ thống khi tạo nhóm:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

router.put(['/teams/:id', '/api/teams/:id', '/admin/teams/:id', '/api/admin/teams/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, leader_id, description, member_ids } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Thiếu ID nhóm' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (leader_id !== undefined) updateData.leader_id = leader_id || null;
    if (description !== undefined) updateData.description = description || null;

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (teamError) {
      console.error('[Teams API] Lỗi khi cập nhật nhóm:', teamError);
      res.status(500).json({ error: teamError.message });
      return;
    }

    if (member_ids && Array.isArray(member_ids)) {
      await supabaseAdmin
        .from('profiles')
        .update({ team_id: null })
        .eq('team_id', id);

      if (member_ids.length > 0) {
        await supabaseAdmin
          .from('profiles')
          .update({ team_id: id })
          .in('id', member_ids);
      }
    }

    res.json({ success: true, team });
  } catch (error: any) {
    console.error('[Teams API] Lỗi hệ thống khi cập nhật nhóm:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

router.delete(['/teams/:id', '/api/teams/:id', '/admin/teams/:id', '/api/admin/teams/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Thiếu ID nhóm' });
      return;
    }

    const supabaseAdmin = getAdminSupabaseClient(req);

    await supabaseAdmin
      .from('profiles')
      .update({ team_id: null })
      .eq('team_id', id);

    const { error: deleteError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Teams API] Lỗi khi xóa nhóm:', deleteError);
      res.status(500).json({ error: deleteError.message });
      return;
    }

    res.json({ success: true, message: 'Đã xóa nhóm thành công' });
  } catch (error: any) {
    console.error('[Teams API] Lỗi hệ thống khi xóa nhóm:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;
