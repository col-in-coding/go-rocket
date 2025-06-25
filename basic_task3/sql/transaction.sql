-- CREATE TABLE accounts (
--     id INT PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     balance DECIMAL(10, 2) NOT NULL
-- );

-- CREATE TABLE transactions (
--     id INT PRIMARY KEY,
--     from_account_id INT NOT NULL,
--     to_account_id INT NOT NULL,
--     amount DECIMAL(10, 2) NOT NULL,
--     transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (from_account_id) REFERENCES accounts(id),
--     FOREIGN KEY (to_account_id) REFERENCES accounts(id)
-- );

-- INSERT INTO accounts (id, name, balance) VALUES (1, 'Alice', 1000.00);
-- INSERT INTO accounts (id, name, balance) VALUES (2, 'Bob', 500.00);

-- psql -h localhost -U postgres -W -d mydb -f transaction.sql
DO $$
DECLARE
    rows_affected INTEGER;
    rows_affected_recipient INTEGER;
BEGIN
    -- Lock the account to ensure no other transaction can modify it
    PERFORM balance FROM accounts WHERE id = 1 FOR UPDATE;

    -- If balance is sufficient, proceed with the transaction
    UPDATE accounts SET balance = balance - 100 WHERE id = 1 AND balance >= 100;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    IF rows_affected < 1 THEN
        -- If no rows were updated, it means the balance was insufficient
        RAISE EXCEPTION 'Insufficient funds for transaction';
    ELSE
        INSERT INTO transactions (id, from_account_id, to_account_id, amount) 
          VALUES (1, 1, 2, 100);

        -- Update the recipient's account balance
        UPDATE accounts SET balance = balance + 100 WHERE id = 2;
        GET DIAGNOSTICS rows_affected_recipient = ROW_COUNT;

        IF rows_affected_recipient < 1 THEN
          RAISE EXCEPTION 'Failed to update recipient account balance';
        END IF;
    END IF;
END
$$;