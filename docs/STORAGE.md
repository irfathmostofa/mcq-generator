# Supabase Storage

## Bucket

Name: `resources`  
Public: no  
File size limit: 20 MiB  
Allowed MIME: `application/pdf`

## Policies (SQL)

```sql
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

create policy "admins_upload_resources"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resources'
  and public.is_admin()
);

create policy "admins_read_resources"
on storage.objects for select
to authenticated
using (
  bucket_id = 'resources'
  and public.is_admin()
);

create policy "admins_update_resources"
on storage.objects for update
to authenticated
using (
  bucket_id = 'resources'
  and public.is_admin()
);

create policy "admins_delete_resources"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'resources'
  and public.is_admin()
);
```

Participants never receive signed URLs to original PDFs unless an admin explicitly shares one.
