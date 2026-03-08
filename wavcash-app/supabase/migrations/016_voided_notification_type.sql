-- 016: Add 'agreement_voided' notification type
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check,
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'payout_received','split_signed','all_signed',
      'agreement_live','invite_received','agreement_voided'
    ));
