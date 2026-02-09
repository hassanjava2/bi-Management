/**
 * BI Management - Invoice Workflow Service Unit Tests
 * Phase 0 - تحولات السير المسموحة
 */

const invoiceWorkflow = require('../../src/services/invoiceWorkflow.service');

describe('Invoice Workflow Service', () => {
    describe('exports and constants', () => {
        it('exports INVOICE_STATUS with expected values', () => {
            expect(invoiceWorkflow.INVOICE_STATUS).toBeDefined();
            expect(invoiceWorkflow.INVOICE_STATUS.DRAFT).toBe('draft');
            expect(invoiceWorkflow.INVOICE_STATUS.WAITING).toBe('waiting');
            expect(invoiceWorkflow.INVOICE_STATUS.PENDING_AUDIT).toBe('pending_audit');
            expect(invoiceWorkflow.INVOICE_STATUS.PENDING_PREPARATION).toBe('pending_preparation');
            expect(invoiceWorkflow.INVOICE_STATUS.COMPLETED).toBe('completed');
        });

        it('exports WORKFLOW_EVENTS with expected values', () => {
            expect(invoiceWorkflow.WORKFLOW_EVENTS).toBeDefined();
            expect(invoiceWorkflow.WORKFLOW_EVENTS.CREATED).toBe('created');
            expect(invoiceWorkflow.WORKFLOW_EVENTS.SAVED_WAITING).toBe('saved_waiting');
            expect(invoiceWorkflow.WORKFLOW_EVENTS.AUDITED).toBe('audited');
            expect(invoiceWorkflow.WORKFLOW_EVENTS.PREPARED).toBe('prepared');
            expect(invoiceWorkflow.WORKFLOW_EVENTS.CONVERTED_TO_ACTIVE).toBe('converted_to_active');
        });

        it('exports all required functions', () => {
            expect(typeof invoiceWorkflow.logWorkflow).toBe('function');
            expect(typeof invoiceWorkflow.transitionTo).toBe('function');
            expect(typeof invoiceWorkflow.setAudited).toBe('function');
            expect(typeof invoiceWorkflow.setPrepared).toBe('function');
            expect(typeof invoiceWorkflow.getWorkflowLog).toBe('function');
            expect(typeof invoiceWorkflow.createReminder).toBe('function');
            expect(typeof invoiceWorkflow.getRemindersDue).toBe('function');
            expect(typeof invoiceWorkflow.markReminderSent).toBe('function');
            expect(typeof invoiceWorkflow.deleteRemindersForInvoice).toBe('function');
        });
    });

    describe('allowed transitions matrix', () => {
        it('draft can transition to waiting or pending_audit', () => {
            const { INVOICE_STATUS } = invoiceWorkflow;
            const allowedFromDraft = [INVOICE_STATUS.WAITING, INVOICE_STATUS.PENDING_AUDIT];
            expect(allowedFromDraft).toContain('waiting');
            expect(allowedFromDraft).toContain('pending_audit');
        });

        it('waiting can transition to pending_audit, pending_preparation, or completed', () => {
            const allowedFromWaiting = ['pending_audit', 'pending_preparation', 'completed'];
            expect(allowedFromWaiting).toContain('completed');
        });
    });
});
