-- Admin email allowlist for restricting access to admin dashboard
create table admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Seed initial admin
insert into admin_allowlist (email) values ('web3bandit@gmail.com');
