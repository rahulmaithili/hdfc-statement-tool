import streamlit as st
import pdfplumber
import pandas as pd
import io
import re

st.set_page_config(page_title="HDFC Statement Analyzer", layout="wide")

def parse_hdfc_statement(pdf_file):
    transactions = []
    
    with pdfplumber.open(pdf_file) as pdf:
        current_transaction = None
        
        for page in pdf.pages:
            text = page.extract_text(layout=True)
            if not text:
                continue
                
            for line in text.split('\n'):
                # Check if line starts with Date (e.g. 01/01/26)
                match = re.match(r'^\s*(\d{2}/\d{2}/\d{2})\s+(.*)$', line)
                if match:
                    date = match.group(1)
                    rest = match.group(2)
                    
                    # Find ValueDt (e.g. 01/01/26) and the amounts at the end
                    val_dt_match = re.search(r'\s+(\d{2}/\d{2}/\d{2})\s+([\d,.\s]+)$', rest)
                    if val_dt_match:
                        narration_chq = rest[:val_dt_match.start()].strip()
                        val_dt = val_dt_match.group(1)
                        amounts_str = val_dt_match.group(2).strip()
                        amounts = amounts_str.split()
                        
                        if len(amounts) >= 2:
                            balance_str = amounts[-1].replace(',', '')
                            balance = float(balance_str)
                            
                            amt_str = amounts[-2].replace(',', '')
                            amt = float(amt_str)
                            
                            amt_pos = line.rfind(amounts[-2])
                            
                            if current_transaction:
                                transactions.append(current_transaction)
                                
                            current_transaction = {
                                "Date": date,
                                "Narration": narration_chq,
                                "Withdrawal": 0.0,
                                "Deposit": 0.0,
                                "Balance": balance,
                                "Amount": amt,
                                "AmtPos": amt_pos
                            }
                elif current_transaction:
                    # Continuation of Narration
                    line_stripped = line.strip()
                    if line_stripped and not re.search(r'[\d,]+\.\d{2}$', line_stripped):
                        # Don't add header lines or footer lines
                        if "Statement From" not in line and "HDFC BANK" not in line and "*Closing balance" not in line:
                            current_transaction["Narration"] += " " + line_stripped
                            
        if current_transaction:
            transactions.append(current_transaction)
            
    # Determine Withdrawal vs Deposit
    prev_balance = None
    for t in transactions:
        if prev_balance is not None:
            diff = t["Balance"] - prev_balance
            # Add a small tolerance for float comparison
            if diff > 0.01:
                t["Deposit"] = t["Amount"]
            elif diff < -0.01:
                t["Withdrawal"] = t["Amount"]
            else:
                # If balance didn't change (rare), use position heuristic
                if t["AmtPos"] > 74:
                    t["Deposit"] = t["Amount"]
                else:
                    t["Withdrawal"] = t["Amount"]
        else:
            # First transaction: use position heuristic
            if t["AmtPos"] > 74:
                t["Deposit"] = t["Amount"]
            else:
                t["Withdrawal"] = t["Amount"]
        prev_balance = t["Balance"]
        
    return pd.DataFrame(transactions)

def categorize_transaction(narration):
    narration = narration.upper()
    if 'UPI' in narration:
        return 'UPI Transfer'
    elif 'ATM' in narration or 'CASH' in narration:
        return 'Cash Withdrawal'
    elif 'NEFT' in narration or 'RTGS' in narration or 'IMPS' in narration:
        return 'Bank Transfer'
    elif 'POS' in narration or 'PURCHASE' in narration:
        return 'Card Swipe / POS'
    elif 'CHRG' in narration or 'FEE' in narration or 'GST' in narration:
        return 'Bank Charges'
    elif 'INT' in narration and 'PD' in narration:
        return 'Interest Received'
    elif 'ZOMATO' in narration or 'SWIGGY' in narration:
        return 'Food & Dining'
    elif 'AMAZON' in narration or 'FLIPKART' in narration:
        return 'Shopping'
    else:
        return 'Other'

st.title("📊 HDFC Bank Statement Analyzer")
st.markdown("Upload your HDFC Bank Statement PDF to see categorized income and expenses.")

uploaded_file = st.file_uploader("Upload HDFC Statement (PDF)", type=["pdf"])

if uploaded_file is not None:
    with st.spinner("Parsing statement..."):
        df = parse_hdfc_statement(uploaded_file)
        
    if df.empty:
        st.error("No transactions found. Ensure this is a valid HDFC bank statement.")
    else:
        # Data Processing
        df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%y')
        df['Category'] = df['Narration'].apply(categorize_transaction)
        
        total_income = df['Deposit'].sum()
        total_expense = df['Withdrawal'].sum()
        net_savings = total_income - total_expense
        
        # Dashboard metrics
        st.subheader("💰 Summary")
        col1, col2, col3 = st.columns(3)
        col1.metric("Total Income (Deposits)", f"₹ {total_income:,.2f}")
        col2.metric("Total Expenses (Withdrawals)", f"₹ {total_expense:,.2f}")
        col3.metric("Net Savings", f"₹ {net_savings:,.2f}")
        
        st.divider()
        
        col_chart1, col_chart2 = st.columns(2)
        
        with col_chart1:
            st.subheader("📉 Expenses by Category")
            expenses_df = df[df['Withdrawal'] > 0]
            if not expenses_df.empty:
                exp_by_cat = expenses_df.groupby('Category')['Withdrawal'].sum().reset_index()
                import plotly.express as px
                fig = px.pie(exp_by_cat, values='Withdrawal', names='Category', hole=0.4)
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No expenses found.")
                
        with col_chart2:
            st.subheader("📈 Top 5 Expense Categories")
            if not expenses_df.empty:
                st.dataframe(exp_by_cat.sort_values(by='Withdrawal', ascending=False).head(5), 
                             column_config={"Withdrawal": st.column_config.NumberColumn(format="₹ %.2f")},
                             hide_index=True, use_container_width=True)
                             
        st.divider()
        
        st.subheader("📝 All Transactions")
        st.dataframe(df.sort_values(by='Date', ascending=False), use_container_width=True)
