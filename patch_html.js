const fs = require('fs');

let code = fs.readFileSync('client/app/fees/collect/page.tsx', 'utf8');

const searchStr = `                                            <div className="row g-2">
                                                <div className="col-md-4">
                                                    <label className="form-label small fw-bold text-muted mb-1">Amount <span className="text-danger">*</span></label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text bg-white small">PKR</span>
                                                        <input type="number" className="form-control form-control-sm" placeholder="0"
                                                            value={payAmount} onChange={e => setPayAmount(e.target.value)} min="1" />
                                                    </div>
                                                </div>`;

const repStr = `                                            <div className="row g-2 mt-2">
                                                <div className="col-12" style={{marginBottom: '0px'}}>
                                                    <label className="form-label small fw-bold text-muted mb-1">Amount Breakdown <span className="text-danger">*</span></label>
                                                    <div className="d-flex flex-column gap-2 p-2 bg-light border rounded" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                                        {(!activeSlip.line_items || activeSlip.line_items.length === 0) ? (
                                                            <div className="d-flex justify-content-between align-items-center bg-white p-2 rounded border shadow-sm">
                                                                <span className="small fw-bold text-dark">Total Balance</span>
                                                                <div className="input-group input-group-sm w-auto" style={{maxWidth: '120px'}}>
                                                                    <input type="number" className="form-control form-control-sm text-end" placeholder="0"
                                                                        value={headPayVals['fallback'] || ''} onChange={e => setHeadPayVals({...headPayVals, fallback: e.target.value})} min="0" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            activeSlip.line_items.map((item: any, idx: number) => {
                                                                const headId = item.fee_category_id ? \`cat_\${item.fee_category_id}\` : item.item_name;
                                                                const amtB = parseFloat(item.amount || 0);
                                                                const paid = parseFloat(item.paid_amount || 0);
                                                                const rem = (amtB - paid).toFixed(2);
                                                                return (
                                                                    <div key={idx} className="d-flex justify-content-between align-items-center bg-white p-2 rounded border shadow-sm">
                                                                        <div className="d-flex flex-column" style={{width: '55%'}}>
                                                                            <span className="text-dark fw-bold" style={{ fontSize: '0.85rem' }}>{item.item_name || 'Previous Balance'}</span>
                                                                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Billed: {amtB.toLocaleString('en-PK')} {paid > 0 ? \` • Paid: \${paid.toLocaleString('en-PK')}\` : ''}</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-2 justify-content-end" style={{width: '45%'}}>
                                                                            {amtB > 0 && <span className="text-danger fw-bold" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Bal: {rem}</span>}
                                                                            <div className="input-group input-group-sm w-auto" style={{ maxWidth: '90px' }}>
                                                                                <input type="number" className="form-control form-control-sm text-end" placeholder="0"
                                                                                    value={headPayVals[headId] || ''} onChange={e => setHeadPayVals({...headPayVals, [headId]: e.target.value})}
                                                                                    disabled={parseFloat(rem) <= 0 && paid > 0} min="0" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                    <div className="d-flex justify-content-between fw-bold text-dark mt-2 mb-1 px-1 small">
                                                        <span>Grand Total:</span>
                                                        <span>PKR {Object.values(headPayVals).reduce((sum, v) => sum + (parseFloat(v) || 0), 0).toLocaleString('en-PK')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="row g-2 mt-0">`;

if (code.includes(searchStr)) {
    code = code.replace(searchStr, repStr);
    fs.writeFileSync('client/app/fees/collect/page.tsx', code, 'utf8');
    console.log("HTML replaced successfully");
} else {
    console.error("HTML chunk not found! Dump first part:\\n" + searchStr);
}
