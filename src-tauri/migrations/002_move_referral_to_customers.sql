PRAGMA foreign_keys = ON;

ALTER TABLE customers
    ADD COLUMN referral TEXT;

UPDATE customers
SET referral = (
    SELECT a.referral
    FROM appointments a
    WHERE a.customer_id = customers.id
      AND a.referral IS NOT NULL
      AND TRIM(a.referral) <> ''
    ORDER BY a.start_at DESC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.customer_id = customers.id
      AND a.referral IS NOT NULL
      AND TRIM(a.referral) <> ''
);
