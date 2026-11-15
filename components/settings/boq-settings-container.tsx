'use client'

import React, { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BoqBoardFinishCatalogSettings } from './boq-board-finish-catalog-settings'
import { AccessoriesAppliancesCatalogSettings } from './accessories-appliances-catalog-settings'
import { Layers, Sparkles, Package } from 'lucide-react'

export function BoqSettingsContainer() {
  const [activeMainTab, setActiveMainTab] = useState<'boards-finishes' | 'accessories-appliances'>('boards-finishes')

  return (
    <div className="space-y-6">
      <Tabs value={activeMainTab} onValueChange={(val) => setActiveMainTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-2 max-w-md h-10 p-1 bg-muted/80">
          <TabsTrigger value="boards-finishes" className="flex items-center gap-2 text-xs font-semibold">
            <Layers className="h-4 w-4" />
            Boards & Finishes
          </TabsTrigger>
          <TabsTrigger value="accessories-appliances" className="flex items-center gap-2 text-xs font-semibold">
            <Package className="h-4 w-4" />
            Accessories & Appliances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boards-finishes" className="mt-6 focus-visible:outline-none">
          <BoqBoardFinishCatalogSettings />
        </TabsContent>

        <TabsContent value="accessories-appliances" className="mt-6 focus-visible:outline-none">
          <AccessoriesAppliancesCatalogSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
