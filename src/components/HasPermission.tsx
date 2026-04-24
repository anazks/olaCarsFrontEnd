import React from 'react';
import { hasPermission } from '../utils/auth';

interface HasPermissionProps {
  permission: string;
  children: React.ReactElement;
  mode?: 'hide' | 'disable';
  tooltip?: string;
}

/**
 * A wrapper component that conditionally renders or disables its children
 * based on the user's granular permissions.
 */
const HasPermission: React.FC<HasPermissionProps> = ({ 
  permission, 
  children, 
  mode = 'disable',
  tooltip
}) => {
  const hasPerm = hasPermission(permission);

  if (hasPerm) {
    return children;
  }

  if (mode === 'hide') {
    return null;
  }

  // Disable mode: Clone the child and inject disabled props + styling
  // We only clone if it's a valid React element
  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      // Prevent clicks and maintain consistent styling
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      style: { 
        ...((children as React.ReactElement<any>).props.style || {}), 
        opacity: 0.5, 
        cursor: 'not-allowed',
        pointerEvents: 'auto' // Ensure the title/tooltip still shows
      },
      title: tooltip || `Access Denied: You lack the '${permission}' permission to perform this action.`
    });
  }

  return null;
};

export default HasPermission;
