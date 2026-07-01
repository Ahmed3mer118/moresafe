import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormField, inputClass } from './FormField';

export function RejectReasonModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const submit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('common.reject')}
      subtitle={t('finance.rejectPlaceholder')}
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="red" loading={loading} disabled={!reason.trim()} onClick={submit}>
            {t('common.reject')}
          </Button>
        </>
      }
    >
      <FormField label={t('common.reason')}>
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('finance.rejectPlaceholder')}
          autoFocus
        />
      </FormField>
    </Modal>
  );
}
