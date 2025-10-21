CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    cust_name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pm_plans (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    plan_details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO customers (cust_name, code, remark) VALUES
('Customer A', 'CUSTA', 'Remark for Customer A'),
('Customer B', 'CUSTB', 'Remark for Customer B'),
('Customer C', 'CUSTC', 'Remark for Customer C');

INSERT INTO pm_plans (customer_id, plan_details) VALUES
(1, 'PM Plan details for Customer A'),
(2, 'PM Plan details for Customer B');