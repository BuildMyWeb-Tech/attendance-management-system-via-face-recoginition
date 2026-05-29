const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-3' };
  return (
    <div className="flex items-center justify-center gap-3">
      <div className={`${sizes[size]} border-slate-600 border-t-primary-500 rounded-full animate-spin`} />
      {text && <span className="text-slate-400 text-sm">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
