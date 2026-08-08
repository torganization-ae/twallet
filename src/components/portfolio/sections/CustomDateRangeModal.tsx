import React, { memo, useEffect, useState } from '../../../lib/teact/teact';

import type { PortfolioCustomDateRange } from '../../../global/types';

import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';

import Button from '../../ui/Button';
import Modal from '../../ui/Modal';

import styles from './CustomDateRangeModal.module.scss';

type OwnProps = {
  isOpen: boolean;
  initialRange?: PortfolioCustomDateRange;
  onClose: NoneToVoidFunction;
  onApply: (range: PortfolioCustomDateRange) => void;
};

function toInputDate(value?: string) {
  return value?.slice(0, 10) ?? '';
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function CustomDateRangeModal({
  isOpen,
  initialRange,
  onClose,
  onApply,
}: OwnProps) {
  const lang = useLang();
  const [from, setFrom] = useState(toInputDate(initialRange?.from));
  const [to, setTo] = useState(toInputDate(initialRange?.to));

  useEffect(() => {
    if (!isOpen) return;
    setFrom(toInputDate(initialRange?.from) || todayUtcDate());
    setTo(toInputDate(initialRange?.to) || todayUtcDate());
  }, [isOpen, initialRange?.from, initialRange?.to]);

  const handleApply = useLastCallback(() => {
    if (!from || !to) return;
    onApply({ from, to });
    onClose();
  });

  const isInvalid = !from || !to;

  return (
    <Modal
      isOpen={isOpen}
      isCompact
      title={lang('Custom Date Range')}
      hasCloseButton
      onClose={onClose}
    >
      <div className={styles.content}>
        <label className={styles.field}>
          <span className={styles.label}>{lang('From')}</span>
          <input
            type="date"
            className={styles.input}
            value={from}
            max={to || todayUtcDate()}
            onChange={(e) => setFrom(e.currentTarget.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{lang('To')}</span>
          <input
            type="date"
            className={styles.input}
            value={to}
            min={from || undefined}
            max={todayUtcDate()}
            onChange={(e) => setTo(e.currentTarget.value)}
          />
        </label>
        <Button
          isPrimary
          isDisabled={isInvalid}
          className={styles.apply}
          onClick={handleApply}
        >
          {lang('Done')}
        </Button>
      </div>
    </Modal>
  );
}

export default memo(CustomDateRangeModal);
