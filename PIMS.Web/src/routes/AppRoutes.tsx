import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { HeadOfficesPage } from '../pages/organization/HeadOfficesPage';
import { BranchesPage } from '../pages/organization/BranchesPage';
import { DepartmentsPage } from '../pages/organization/DepartmentsPage';
import { SubDepartmentsPage } from '../pages/organization/SubDepartmentsPage';
import { StoresPage } from '../pages/stores/StoresPage';
import { StoreLocationsPage } from '../pages/stores/StoreLocationsPage';
import { ItemCategoriesPage } from '../pages/items/ItemCategoriesPage';
import { ItemsMasterPage } from '../pages/items/ItemsMasterPage';
import { UnitsOfMeasurePage } from '../pages/items/UnitsOfMeasurePage';
import { PackageTypesPage } from '../pages/items/PackageTypesPage';
import { ItemPricingPage } from '../pages/items/ItemPricingPage';
import { VendorsDirectoryPage } from '../pages/vendors/VendorsDirectoryPage';
import { VendorContactsPage } from '../pages/vendors/VendorContactsPage';
import { VendorItemPricingPage } from '../pages/vendors/VendorItemPricingPage';
import { PurchaseRequestsPage } from '../pages/procurement/PurchaseRequestsPage';
import { QuotationsPage } from '../pages/procurement/QuotationsPage';
import { PurchaseOrdersPage } from '../pages/procurement/PurchaseOrdersPage';
import { GoodsReceiptsPage } from '../pages/receiving/GoodsReceiptsPage';
import { InventoryBalancesPage } from '../pages/inventory/InventoryBalancesPage';
import { StockMovementsPage } from '../pages/inventory/StockMovementsPage';
import { StockTransfersPage } from '../pages/inventory/StockTransfersPage';
import { UsersListPage } from '../pages/users/UsersListPage';
import { RolesPermissionsPage } from '../pages/users/RolesPermissionsPage';
import { UserStoreAssignmentsPage } from '../pages/users/UserStoreAssignmentsPage';
import { TabsAccessPage } from '../pages/users/TabsAccessPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes wrapped in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Procurement Module */}
        <Route path="procurement" element={<Navigate to="/procurement/requests" replace />} />
        <Route path="procurement/requests" element={<PurchaseRequestsPage />} />
        <Route path="procurement/quotations" element={<QuotationsPage />} />
        <Route path="procurement/orders" element={<PurchaseOrdersPage />} />

        {/* Receiving Module */}
        <Route path="receiving" element={<Navigate to="/receiving/goods-receipts" replace />} />
        <Route path="receiving/goods-receipts" element={<GoodsReceiptsPage />} />

        {/* Inventory Module */}
        <Route path="inventory" element={<Navigate to="/inventory/balances" replace />} />
        <Route path="inventory/balances" element={<InventoryBalancesPage />} />
        <Route path="inventory/movements" element={<StockMovementsPage />} />
        <Route path="inventory/transfers" element={<StockTransfersPage />} />

        {/* Stores Module */}
        <Route path="stores" element={<Navigate to="/stores/list" replace />} />
        <Route path="stores/list" element={<StoresPage />} />
        <Route path="stores/locations" element={<StoreLocationsPage />} />

        {/* Items Module */}
        <Route path="items" element={<Navigate to="/items/catalog" replace />} />
        <Route path="items/catalog" element={<ItemsMasterPage />} />
        <Route path="items/categories" element={<ItemCategoriesPage />} />
        <Route path="items/pricing" element={<ItemPricingPage />} />
        <Route path="items/units" element={<UnitsOfMeasurePage />} />
        <Route path="items/package-types" element={<PackageTypesPage />} />

        {/* Vendors Module */}
        <Route path="vendors" element={<Navigate to="/vendors/directory" replace />} />
        <Route path="vendors/directory" element={<VendorsDirectoryPage />} />
        <Route path="vendors/contacts" element={<VendorContactsPage />} />
        <Route path="vendors/pricing" element={<VendorItemPricingPage />} />

        {/* Organization Module */}
        <Route path="organization" element={<Navigate to="/organization/branches" replace />} />
        <Route path="organization/head-offices" element={<HeadOfficesPage />} />
        <Route path="organization/branches" element={<BranchesPage />} />
        <Route path="organization/departments" element={<DepartmentsPage />} />
        <Route path="organization/sub-departments" element={<SubDepartmentsPage />} />

        {/* Users & Access Module */}
        <Route path="users" element={<Navigate to="/users/list" replace />} />
        <Route path="users/list" element={<UsersListPage />} />
        <Route path="users/roles" element={<RolesPermissionsPage />} />
        <Route path="users/store-assignments" element={<UserStoreAssignmentsPage />} />
        <Route path="users/tabs" element={<TabsAccessPage />} />

        {/* Catch-all route within layout */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
