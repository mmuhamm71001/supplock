export type Role = 'admin' | 'teacher';

export type School = { id: string; name: string; code: string; logo_url: string | null };

export type Profile = { id: string; school_id: string; name: string; email: string; role: Role; room: string };

export type Me = Profile & { school: School };
