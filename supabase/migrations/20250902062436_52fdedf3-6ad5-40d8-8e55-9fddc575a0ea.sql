-- Security hardening for documents table and documents storage bucket
-- 1) Add user_id column for ownership (nullable to avoid breaking existing rows)
alter table public.documents
  add column if not exists user_id uuid;

-- Helpful indexes
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_expires_at on public.documents(expires_at);

-- Ensure RLS is enabled
alter table public.documents enable row level security;

-- Drop overly permissive existing policies if present
drop policy if exists "Everyone can view non-expired documents" on public.documents;
drop policy if exists "Anyone can upload documents" on public.documents;
drop policy if exists "Allow updates for validation" on public.documents;

-- Restrictive, user-based policies (owners + service role)
create policy "Users can view their own non-expired documents"
  on public.documents
  for select
  to authenticated
  using (
    (auth.uid() = user_id and expires_at > now())
    or (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
  );

create policy "Users can insert their own documents"
  on public.documents
  for insert
  to authenticated
  with check (
    (auth.uid() = user_id)
    or (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
  );

create policy "Users can update their own documents"
  on public.documents
  for update
  to authenticated
  using (
    (auth.uid() = user_id)
    or (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
  )
  with check (
    (auth.uid() = user_id)
    or (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
  );

create policy "Users can delete their own documents"
  on public.documents
  for delete
  to authenticated
  using (
    (auth.uid() = user_id)
    or (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
  );

-- 2) Secure the storage bucket that holds document contents
-- Make bucket private so public URLs no longer bypass RLS
update storage.buckets set public = false where id = 'documents';

-- Storage object policies for the 'documents' bucket
create policy "doc_objects_select_owner"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
      or exists (
        select 1 from public.documents d
        where d.storage_path = name
          and d.user_id = auth.uid()
          and d.expires_at > now()
      )
    )
  );

create policy "doc_objects_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
  );

create policy "doc_objects_update_owner"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
      or exists (
        select 1 from public.documents d
        where d.storage_path = name
          and d.user_id = auth.uid()
      )
    )
  );

create policy "doc_objects_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role')
      or exists (
        select 1 from public.documents d
        where d.storage_path = name
          and d.user_id = auth.uid()
      )
    )
  );