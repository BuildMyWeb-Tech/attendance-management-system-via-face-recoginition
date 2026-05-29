const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="py-16 text-center">
    {Icon && <Icon className="w-14 h-14 text-slate-700 mx-auto mb-4" />}
    <p className="text-slate-400 font-medium text-lg">{title}</p>
    {description && <p className="text-slate-600 text-sm mt-1">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export default EmptyState;
