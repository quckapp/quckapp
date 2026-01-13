import { useSelector, useDispatch } from 'react-redux';
import Toast from './Toast';
import type { RootState } from '../../store';
import { removeToast } from '../../store/slices/toastSlice';

const ToastContainer = () => {
  const dispatch = useDispatch();
  const { toasts } = useSelector((state: RootState) => state.toast);

  const handleClose = (id: string) => {
    dispatch(removeToast(id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={handleClose} />
      ))}
    </div>
  );
};

export default ToastContainer;
