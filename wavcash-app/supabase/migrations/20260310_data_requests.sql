-- Data requests table for tracking privacy/data rights requests
create table data_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  sender_email text not null,
  sender_name text,
  request_type text not null default 'data_rights',
  status text not null default 'received',
  received_at timestamptz not null default now(),
  completed_at timestamptz,
  completion_summary text,
  original_subject text,
  original_body text,
  resend_email_id text,
  created_at timestamptz not null default now()
);

create index idx_data_requests_status on data_requests(status);

-- Auto-increment reference (DR-0001, DR-0002, ...)
create or replace function set_data_request_reference()
returns trigger as $$
begin
  new.reference := 'DR-' || lpad(
    (select coalesce(max(substring(reference from 4)::int), 0) + 1
     from data_requests)::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_data_request_ref
  before insert on data_requests
  for each row execute function set_data_request_reference();
