import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import BrandMark from "./BrandMark";

const AuthHeader = ({ promptText, actionText, actionTo }) => {
  const { user } = useAuth();
  const hideLoginAction = Boolean(user) && actionTo === "/login";

  return (
    <header className="border-b border-slate-200">
      <div className="w-full px-6 sm:px-10 lg:px-14">
        <div className="flex h-[74px] items-center justify-between">
          <BrandMark textClassName="text-xl font-bold tracking-tight text-slate-900" />
          {!hideLoginAction && (
            <p className="text-sm text-slate-600">
              {promptText}{" "}
              <Link to={actionTo} className="font-semibold text-emerald-700 hover:underline">
                {actionText}
              </Link>
            </p>
          )}
        </div>
      </div>
    </header>
  );
};

export default AuthHeader;


